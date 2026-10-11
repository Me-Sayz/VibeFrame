import { isAbort } from "./render";

export class LicenseError extends Error {}

export async function requestAnimation(
  prompt: string,
  signal: AbortSignal,
  license: string
): Promise<{ text: string; model: string }> {
  let res: Response;
  try {
    res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-license": license },
      body: JSON.stringify({ prompt }),
      signal,
    });
  } catch (e) {
    if (isAbort(e)) throw e;
    throw new Error("Tidak bisa menghubungi server. Pastikan npm run dev masih berjalan.");
  }

  const data = (await res.json().catch(() => null)) as { text?: unknown; model?: unknown; error?: unknown } | null;
  if (!res.ok) {
    const message = typeof data?.error === "string" ? data.error : `Server membalas error ${res.status}.`;
    throw res.status === 401 ? new LicenseError(message) : new Error(message);
  }
  if (typeof data?.text !== "string" || !data.text) throw new Error("Balasan AI kosong.");
  return { text: data.text, model: typeof data.model === "string" ? data.model : "" };
}

export async function refineIdea(idea: string, license: string, signal: AbortSignal): Promise<string> {
  let res: Response;
  try {
    res = await fetch("/api/refine", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(license ? { "x-license": license } : {}) },
      body: JSON.stringify({ idea }),
      signal,
    });
  } catch (e) {
    if (isAbort(e)) throw e;
    throw new Error("Tidak bisa menghubungi server. Pastikan npm run dev masih berjalan.");
  }

  const data = (await res.json().catch(() => null)) as { text?: unknown; error?: unknown } | null;
  if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : `Server membalas error ${res.status}.`);
  if (typeof data?.text !== "string" || !data.text) throw new Error("Balasan AI kosong.");
  return data.text;
}