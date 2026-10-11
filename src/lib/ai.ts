import type { Ratio } from "@/types";
import { isAbort } from "./render";

export class LicenseError extends Error {}

const NETWORK_ERROR = "Tidak bisa menghubungi server. Pastikan npm run dev masih berjalan.";

async function post(path: string, body: unknown, signal: AbortSignal, license: string) {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(license ? { "x-license": license } : {}) },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if (isAbort(e)) throw e;
    throw new Error(NETWORK_ERROR);
  }
  const data = (await res.json().catch(() => null)) as { text?: unknown; model?: unknown; error?: unknown } | null;
  if (!res.ok) {
    const message = typeof data?.error === "string" ? data.error : `Server membalas error ${res.status}.`;
    throw res.status === 401 ? new LicenseError(message) : new Error(message);
  }
  if (typeof data?.text !== "string" || !data.text) throw new Error("Balasan AI kosong.");
  return { text: data.text, model: typeof data.model === "string" ? data.model : "" };
}

export function requestAnimation(
  prompt: string,
  signal: AbortSignal,
  license: string
): Promise<{ text: string; model: string }> {
  return post("/api/generate", { prompt }, signal, license);
}

export interface FixRequest {
  code: string;
  instruction: string;
  error: string;
  duration: number;
  ratio: Ratio;
  layers: { name: string; width: number; height: number }[];
}

export function requestFix(
  input: FixRequest,
  signal: AbortSignal,
  license: string
): Promise<{ text: string; model: string }> {
  return post("/api/fix", input, signal, license);
}

export async function refineIdea(idea: string, license: string, signal: AbortSignal): Promise<string> {
  const { text } = await post("/api/refine", { idea }, signal, license);
  return text;
}
