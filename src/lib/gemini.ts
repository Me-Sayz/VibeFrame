const API = "https://generativelanguage.googleapis.com/v1beta/models";
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

export interface GeminiOptions {
  maxOutputTokens: number;
  temperature: number;
  timeoutMs: number;
  signal?: AbortSignal;
  accept?: (text: string) => boolean;
}

export type GeminiResult = { ok: true; text: string; model: string } | { ok: false; error: string; status: number };

interface Attempt {
  text?: string;
  error?: string;
  status: number;
  retry: boolean;
}

const parseModels = (raw: string | undefined) =>
  (raw ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean)
    .slice(0, MAX_MODELS);

export const geminiModels = () => parseModels(process.env.GEMINI_MODELS ?? process.env.GEMINI_MODEL);

export const liteModels = () => {
  const own = parseModels(process.env.GEMINI_LITE_MODELS);
  return own.length > 0 ? own : [...geminiModels()].reverse();
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

async function ask(model: string, key: string, prompt: string, o: GeminiOptions): Promise<Attempt> {
  const timeout = AbortSignal.timeout(o.timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${API}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: o.temperature, maxOutputTokens: o.maxOutputTokens },
      }),
      signal: o.signal ? AbortSignal.any([timeout, o.signal]) : timeout,
    });
  } catch (e) {
    if (o.signal?.aborted) return { error: "Dibatalkan.", status: 499, retry: false };
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
  if (o.accept && !o.accept(text)) {
    return { error: "Balasan model tidak sesuai format.", status: 502, retry: true };
  }
  return { text, status: 200, retry: false };
}

export async function generateText(
  models: string[],
  key: string,
  prompt: string,
  options: GeminiOptions
): Promise<GeminiResult> {
  const started = Date.now();
  const notes: string[] = [];
  let last: Attempt = { error: "Tidak ada model yang dicoba.", status: 502, retry: false };

  for (const model of models) {
    if (notes.length > 0 && (Date.now() - started > BUDGET_MS || options.signal?.aborted)) break;
    last = await ask(model, key, prompt, options);
    if (last.text) return { ok: true, text: last.text, model };
    notes.push(`${model}: ${last.error}`);
    if (!last.retry) break;
  }

  const error = notes.length > 1 ? `Semua model gagal. ${notes.join(" | ")}` : (last.error ?? "Gagal.");
  return { ok: false, error, status: last.status };
}
