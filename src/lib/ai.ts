import type { MagicSettings } from "@/lib/magic";
import type { Site } from "@/lib/metadata";
import { CONCEPTS, RATIO_KEYS, STYLES, type Ratio } from "@/types";
import { isAbort } from "./render";

export class LicenseError extends Error {}

const NETWORK_ERROR = "Tidak bisa menghubungi server. Pastikan npm run dev masih berjalan.";

async function call(path: string, body: unknown, signal: AbortSignal, license: string) {
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
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) {
    const message = typeof data?.error === "string" ? data.error : `Server membalas error ${res.status}.`;
    throw res.status === 401 ? new LicenseError(message) : new Error(message);
  }
  return data ?? {};
}

async function post(path: string, body: unknown, signal: AbortSignal, license: string) {
  const data = await call(path, body, signal, license);
  if (typeof data.text !== "string" || !data.text) throw new Error("Balasan AI kosong.");
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

export interface MetadataResult {
  text: string;
  keywords: string[];
  model: string;
}

export async function requestMetadata(
  input: { description: string; site: Site; loop: boolean },
  signal: AbortSignal,
  license: string
): Promise<MetadataResult> {
  const data = await call("/api/metadata", input, signal, license);
  if (
    typeof data.text !== "string" ||
    !data.text ||
    !Array.isArray(data.keywords) ||
    !data.keywords.every((k) => typeof k === "string")
  ) {
    throw new Error("Balasan AI kosong atau tidak sesuai format.");
  }
  return { text: data.text, keywords: data.keywords as string[], model: typeof data.model === "string" ? data.model : "" };
}

export interface MagicResult extends MagicSettings {
  model: string;
}

export async function requestMagic(idea: string, signal: AbortSignal, license: string): Promise<MagicResult> {
  const d = await call("/api/magic", { idea }, signal, license);
  if (
    typeof d.style !== "string" ||
    !(STYLES as readonly string[]).includes(d.style) ||
    typeof d.concept !== "string" ||
    !(CONCEPTS as readonly string[]).includes(d.concept) ||
    typeof d.ratio !== "string" ||
    !(RATIO_KEYS as string[]).includes(d.ratio) ||
    typeof d.duration !== "number" ||
    !Number.isFinite(d.duration) ||
    typeof d.reason !== "string" ||
    !d.reason
  ) {
    throw new Error("Balasan AI kosong atau tidak sesuai format.");
  }
  return {
    style: d.style as MagicResult["style"],
    concept: d.concept as MagicResult["concept"],
    ratio: d.ratio as Ratio,
    duration: Math.round(d.duration),
    reason: d.reason,
    model: typeof d.model === "string" ? d.model : "",
  };
}
