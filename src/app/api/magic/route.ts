import { NextResponse } from "next/server";
import { acquire, release } from "@/lib/aiLock";
import { generateText, geminiKeys, geminiModels } from "@/lib/gemini";
import { reply, sameOrigin } from "@/lib/http";
import { licenseMessage, verifyLicense } from "@/lib/license";
import { MAGIC_MAX, MAGIC_MIN, buildMagicPrompt, parseMagic } from "@/lib/magic";
import { isLimited } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PER_MINUTE = 10;

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
    return reply("GEMINI_API_KEY (boleh beberapa, pisahkan koma) dan GEMINI_MODELS belum diatur di .env.local. Isi keduanya lalu restart npm run dev.", 500);
  }

  let body: { idea?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return reply("Isi permintaan tidak valid.", 400);
  }
  const idea = typeof body.idea === "string" ? body.idea.replace(/\r\n?/g, "\n").trim() : "";
  if (idea.length < MAGIC_MIN) return reply(`Tulis ide videonya dulu (minimal ${MAGIC_MIN} karakter).`, 400);
  if (idea.length > MAGIC_MAX) return reply(`Ide terlalu panjang (maksimal ${MAGIC_MAX} karakter).`, 400);

  const owner = auth.code;
  if (!acquire(owner)) {
    return reply("Lisensi ini sedang dipakai proses AI lain. Tunggu sampai selesai, lalu coba lagi.", 429);
  }
  try {
    if (isLimited(`magic:${owner}`, PER_MINUTE, 60_000)) {
      return reply(`Terlalu cepat: maksimal ${PER_MINUTE} permintaan atur otomatis per menit untuk satu lisensi.`, 429);
    }
    const result = await generateText(models, key, buildMagicPrompt(idea), {
      maxOutputTokens: 512,
      temperature: 0.4,
      timeoutMs: 30_000,
      signal: req.signal,
      accept: (text) => parseMagic(text).ok,
    });
    if (!result.ok) return reply(result.error, result.status);
    const parsed = parseMagic(result.text);
    if (!parsed.ok) return reply(parsed.error, 502);
    return NextResponse.json({ ...parsed.value, model: result.model });
  } finally {
    release(owner);
  }
}
