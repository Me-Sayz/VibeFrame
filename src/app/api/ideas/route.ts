import { NextResponse } from "next/server";
import { acquire, release } from "@/lib/aiLock";
import { generateText, geminiKeys, geminiModels } from "@/lib/gemini";
import { reply, sameOrigin } from "@/lib/http";
import {
  IDEA_PICK_MAX,
  IDEA_TOPIC_MAX,
  IDEA_TOPIC_MIN,
  buildComposePrompt,
  buildIdeasPrompt,
  normalizeIdeas,
  parseIdeas,
  tidyDescription,
  type IdeaKind,
} from "@/lib/ideas";
import { licenseMessage, verifyLicense } from "@/lib/license";
import { isLimited } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PER_MINUTE = 8;

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

  let body: { kind?: unknown; topic?: unknown; picked?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return reply("Isi permintaan tidak valid.", 400);
  }
  if (body.kind !== "video" && body.kind !== "vector") return reply("Jenis ide tidak valid.", 400);
  const kind: IdeaKind = body.kind;
  const topic = typeof body.topic === "string" ? body.topic.replace(/\r\n?/g, "\n").trim() : "";
  if (topic.length < IDEA_TOPIC_MIN) return reply(`Tulis topiknya dulu (minimal ${IDEA_TOPIC_MIN} karakter).`, 400);
  if (topic.length > IDEA_TOPIC_MAX) return reply(`Topik terlalu panjang (maksimal ${IDEA_TOPIC_MAX} karakter).`, 400);

  let compose = false;
  let picked: ReturnType<typeof normalizeIdeas> = [];
  if (body.picked !== undefined) {
    if (!Array.isArray(body.picked) || body.picked.length < 2 || body.picked.length > IDEA_PICK_MAX) {
      return reply(`Pilih 2 sampai ${IDEA_PICK_MAX} ide untuk digabung.`, 400);
    }
    picked = normalizeIdeas(kind, body.picked);
    if (picked.length !== body.picked.length) return reply("Ide yang dipilih tidak valid.", 400);
    compose = true;
  }

  const owner = auth.code;
  if (!acquire(owner)) {
    return reply("Lisensi ini sedang dipakai proses AI lain. Tunggu sampai selesai, lalu coba lagi.", 429);
  }
  try {
    if (isLimited(`ideas:${owner}`, PER_MINUTE, 60_000)) {
      return reply(`Terlalu cepat: maksimal ${PER_MINUTE} permintaan ide per menit untuk satu lisensi.`, 429);
    }
    if (compose) {
      const result = await generateText(models, key, buildComposePrompt(kind, topic, picked), {
        maxOutputTokens: 1024,
        temperature: 0.5,
        timeoutMs: 45_000,
        signal: req.signal,
        accept: (t) => tidyDescription(t).length >= 30,
      });
      if (!result.ok) return reply(result.error, result.status);
      return NextResponse.json({ text: tidyDescription(result.text), model: result.model });
    }
    const result = await generateText(models, key, buildIdeasPrompt(kind, topic), {
      maxOutputTokens: 4096,
      temperature: 0.9,
      timeoutMs: 60_000,
      signal: req.signal,
      accept: (t) => parseIdeas(kind, t).ok,
    });
    if (!result.ok) return reply(result.error, result.status);
    const parsed = parseIdeas(kind, result.text);
    if (!parsed.ok) return reply(parsed.error, 502);
    return NextResponse.json({ ideas: parsed.ideas, model: result.model });
  } finally {
    release(owner);
  }
}
