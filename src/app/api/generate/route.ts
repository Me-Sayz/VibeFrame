import { NextResponse } from "next/server";
import { acquire, release } from "@/lib/aiLock";
import { generateText, geminiKeys, geminiModels } from "@/lib/gemini";
import { reply, sameOrigin } from "@/lib/http";
import { parseImages } from "@/lib/images";
import { licenseMessage, verifyLicense } from "@/lib/license";
import { isLimited } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PROMPT = 30_000;
const PER_MINUTE = 3;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return reply("Permintaan ditolak.", 403);

  const auth = verifyLicense(req.headers.get("x-license"), "ai");
  if (!auth.ok) {
    if (auth.reason === "config") return reply(licenseMessage(auth), 500);
    return NextResponse.json({ error: licenseMessage(auth), reason: auth.reason }, { status: 401 });
  }

  const key = geminiKeys();
  const models = geminiModels();
  if (key.length === 0 || models.length === 0) {
    return reply(
      "GEMINI_API_KEY (boleh beberapa, pisahkan koma) dan GEMINI_MODELS belum diatur di .env.local. Isi keduanya lalu restart npm run dev.",
      500
    );
  }

  let prompt: unknown;
  let rawImages: unknown;
  try {
    const body = (await req.json()) as { prompt?: unknown; images?: unknown };
    prompt = body.prompt;
    rawImages = body.images;
  } catch {
    return reply("Isi permintaan tidak valid.", 400);
  }
  if (typeof prompt !== "string" || prompt.trim().length < 20) return reply("Prompt kosong atau terlalu pendek.", 400);
  if (prompt.length > MAX_PROMPT) return reply(`Prompt terlalu panjang (maksimal ${MAX_PROMPT} karakter).`, 400);
  const images = parseImages(rawImages);
  if (typeof images === "string") return reply(images, 400);

  const owner = auth.code;
  if (!acquire(owner)) {
    return reply("Lisensi ini sedang dipakai proses AI lain. Tunggu sampai selesai, lalu coba lagi.", 429);
  }
  try {
    if (isLimited(`generate:${owner}`, PER_MINUTE, 60_000)) {
      return reply(`Terlalu cepat: maksimal ${PER_MINUTE} animasi per menit untuk satu lisensi. Coba lagi sebentar lagi.`, 429);
    }
    const result = await generateText(models, key, prompt, {
      maxOutputTokens: 32000,
      temperature: 0.7,
      timeoutMs: 90_000,
      signal: req.signal,
      images,
    });
    if (!result.ok) return reply(result.error, result.status);
    return NextResponse.json({ text: result.text, model: result.model });
  } finally {
    release(owner);
  }
}
