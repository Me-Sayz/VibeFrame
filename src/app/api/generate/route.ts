import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API = "https://generativelanguage.googleapis.com/v1beta/models";
const MAX_PROMPT = 30_000;
const TIMEOUT_MS = 90_000;
const BUDGET_MS = 150_000;
const MAX_MODELS = 5;

interface GeminiPart {
  text?: string;
  thought?: boolean;
}

interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string };
}

const reply = (error: string, status: number) => NextResponse.json({ error }, { status });

const sameOrigin = (req: Request) => {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
};

const upstreamMessage = (status: number, detail: string) => {
  const extra = detail ? ` Detail: ${detail.slice(0, 200)}` : "";
  if (status === 401 || status === 403) return `API key ditolak Gemini. Periksa GEMINI_API_KEY di .env.local.${extra}`;
  if (status === 404) return `Model tidak ditemukan. Cek nama model di AI Studio.${extra}`;
  if (status === 429) return "Kuota model ini habis atau terlalu banyak permintaan.";
  if (status === 500 || status === 503) return "Model sedang sibuk (high demand).";
  if (status === 400) return `Permintaan ditolak model.${extra}`;
  return `Gemini membalas dengan error ${status}.${extra}`;
};

const modelList = () =>
  (process.env.GEMINI_MODELS ?? process.env.GEMINI_MODEL ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean)
    .slice(0, MAX_MODELS);

interface Attempt {
  text?: string;
  error?: string;
  status: number;
  retry: boolean;
}

async function ask(model: string, key: string, prompt: string): Promise<Attempt> {
  let res: Response;
  try {
    res = await fetch(`${API}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 32000 },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    return {
      error: timedOut ? "Model terlalu lama menjawab." : "Tidak bisa menghubungi Gemini.",
      status: 504,
      retry: true,
    };
  }

  const data = (await res.json().catch(() => null)) as GeminiResponse | null;

  if (!res.ok) {
    return {
      error: upstreamMessage(res.status, data?.error?.message ?? ""),
      status: res.status === 429 ? 429 : 502,
      retry: res.status !== 401 && res.status !== 403,
    };
  }

  const candidate = data?.candidates?.[0];
  const text = (candidate?.content?.parts ?? [])
    .filter((p) => !p.thought && typeof p.text === "string")
    .map((p) => p.text)
    .join("")
    .trim();

  if (!text) {
    const block = data?.promptFeedback?.blockReason;
    return { error: block ? `Model menolak prompt (${block}).` : "Model tidak mengembalikan teks.", status: 502, retry: true };
  }
  if (candidate?.finishReason === "MAX_TOKENS") {
    return { error: "Balasan AI terpotong karena terlalu panjang.", status: 502, retry: true };
  }
  return { text, status: 200, retry: false };
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return reply("Permintaan ditolak.", 403);

  const key = process.env.GEMINI_API_KEY;
  const models = modelList();
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

  const started = Date.now();
  const notes: string[] = [];
  let last: Attempt = { error: "Tidak ada model yang dicoba.", status: 502, retry: false };

  for (const model of models) {
    if (notes.length > 0 && Date.now() - started > BUDGET_MS) break;
    last = await ask(model, key, prompt);
    if (last.text) return NextResponse.json({ text: last.text, model });
    notes.push(`${model}: ${last.error}`);
    if (!last.retry) break;
  }

  const message = notes.length > 1 ? `Semua model gagal. ${notes.join(" | ")}` : (last.error ?? "Gagal.");
  return reply(message, last.status);
}