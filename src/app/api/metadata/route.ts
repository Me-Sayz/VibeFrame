import { NextResponse } from "next/server";
import { acquire, release } from "@/lib/aiLock";
import { generateText, geminiModels } from "@/lib/gemini";
import { reply, sameOrigin } from "@/lib/http";
import { licenseMessage, verifyLicense } from "@/lib/license";
import { DESC_MAX, DESC_MIN, SITES, buildMetadataPrompt, parseMetadata, type Site } from "@/lib/metadata";
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

  const key = process.env.GEMINI_API_KEY;
  const models = geminiModels();
  if (!key || models.length === 0) {
    return reply("GEMINI_API_KEY dan GEMINI_MODELS belum diatur di .env.local. Isi keduanya lalu restart npm run dev.", 500);
  }

  let body: { description?: unknown; site?: unknown; loop?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return reply("Isi permintaan tidak valid.", 400);
  }
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (description.length < DESC_MIN) return reply(`Tulis deskripsi video dulu (minimal ${DESC_MIN} karakter).`, 400);
  if (description.length > DESC_MAX) return reply(`Deskripsi terlalu panjang (maksimal ${DESC_MAX} karakter).`, 400);
  if (typeof body.site !== "string" || !(body.site in SITES)) return reply("Situs tujuan tidak dikenal.", 400);
  const site = body.site as Site;
  const loop = body.loop === true;

  const owner = auth.code;
  if (!acquire(owner)) {
    return reply("Lisensi ini sedang dipakai proses AI lain. Tunggu sampai selesai, lalu coba lagi.", 429);
  }
  try {
    if (isLimited(`metadata:${owner}`, PER_MINUTE, 60_000)) {
      return reply(`Terlalu cepat: maksimal ${PER_MINUTE} permintaan metadata per menit untuk satu lisensi.`, 429);
    }
    const result = await generateText(models, key, buildMetadataPrompt(description, site, loop), {
      maxOutputTokens: 2048,
      temperature: 0.5,
      timeoutMs: 45_000,
      signal: req.signal,
      accept: (text) => parseMetadata(text, site).ok,
    });
    if (!result.ok) return reply(result.error, result.status);
    const parsed = parseMetadata(result.text, site);
    if (!parsed.ok) return reply(parsed.error, 502);
    return NextResponse.json({ site, text: parsed.value.text, keywords: parsed.value.keywords, model: result.model });
  } finally {
    release(owner);
  }
}
