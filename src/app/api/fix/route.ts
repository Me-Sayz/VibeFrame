import { NextResponse } from "next/server";
import { acquire, release } from "@/lib/aiLock";
import { buildFixPrompt, parseFixBody } from "@/lib/fixPrompt";
import { generateText, geminiModels } from "@/lib/gemini";
import { reply, sameOrigin } from "@/lib/http";
import { licenseMessage, verifyLicense } from "@/lib/license";
import { isLimited } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PER_MINUTE = 6;

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
    return reply("GEMINI_API_KEY dan GEMINI_MODELS belum diatur di .env.local. Isi keduanya lalu restart npm run dev.", 500);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return reply("Isi permintaan tidak valid.", 400);
  }
  const parsed = parseFixBody(body);
  if (!parsed.ok) return reply(parsed.error, 400);

  const owner = auth.code;
  if (!acquire(owner)) {
    return reply("Lisensi ini sedang dipakai proses AI lain. Tunggu sampai selesai, lalu coba lagi.", 429);
  }
  try {
    if (isLimited(`fix:${owner}`, PER_MINUTE, 60_000)) {
      return reply(`Terlalu cepat: maksimal ${PER_MINUTE} perbaikan per menit untuk satu lisensi. Coba lagi sebentar lagi.`, 429);
    }
    const result = await generateText(models, key, buildFixPrompt(parsed.input), {
      maxOutputTokens: 32000,
      temperature: 0.3,
      timeoutMs: 90_000,
      signal: req.signal,
    });
    if (!result.ok) return reply(result.error, result.status);
    return NextResponse.json({ text: result.text, model: result.model });
  } finally {
    release(owner);
  }
}
