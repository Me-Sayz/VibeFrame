import { NextResponse } from "next/server";
import { generateText, geminiModels } from "@/lib/gemini";
import { reply, sameOrigin } from "@/lib/http";
import { licenseMessage, verifyLicense } from "@/lib/license";
import { isLimited } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PROMPT = 30_000;
const PER_MINUTE = 3;
const inflight = new Set<string>();

export async function POST(req: Request) {
  if (!sameOrigin(req)) return reply("Permintaan ditolak.", 403);

  const auth = verifyLicense(req.headers.get("x-license"), "ai");
  if (!auth.ok) {
    if (auth.reason === "config") return reply(licenseMessage(auth), 500);
    return NextResponse.json({ error: licenseMessage(auth), reason: auth.reason }, { status: 401 });
  }

  const key = process.env.GEMINI_API_KEY;
  const models = geminiModels();
  if (!key || models.length === 0) {
    return reply(
      "GEMINI_API_KEY dan GEMINI_MODELS belum diatur di .env.local. Isi keduanya lalu restart npm run dev.",
      500
    );
  }

  let prompt: unknown;
  try {
    prompt = ((await req.json()) as { prompt?: unknown }).prompt;
  } catch {
    return reply("Isi permintaan tidak valid.", 400);
  }
  if (typeof prompt !== "string" || prompt.trim().length < 20) return reply("Prompt kosong atau terlalu pendek.", 400);
  if (prompt.length > MAX_PROMPT) return reply(`Prompt terlalu panjang (maksimal ${MAX_PROMPT} karakter).`, 400);

  const owner = auth.code;
  if (inflight.has(owner)) {
    return reply("Lisensi ini sedang dipakai membuat animasi lain. Tunggu sampai selesai, lalu coba lagi.", 429);
  }
  if (isLimited(`generate:${owner}`, PER_MINUTE, 60_000)) {
    return reply(`Terlalu cepat: maksimal ${PER_MINUTE} animasi per menit untuk satu lisensi. Coba lagi sebentar lagi.`, 429);
  }

  inflight.add(owner);
  try {
    const result = await generateText(models, key, prompt, {
      maxOutputTokens: 32000,
      temperature: 0.7,
      timeoutMs: 90_000,
      signal: req.signal,
    });
    if (!result.ok) return reply(result.error, result.status);
    return NextResponse.json({ text: result.text, model: result.model });
  } finally {
    inflight.delete(owner);
  }
}