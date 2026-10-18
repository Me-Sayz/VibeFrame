export interface RefImage {
  mime: "image/jpeg";
  data: string;
}

export const MAX_REF_IMAGES = 3;
export const REF_MAX_SIDE = 1024;
export const REF_QUALITY = 0.85;

const MAX_B64_EACH = 2_000_000;
const MAX_B64_TOTAL = 5_000_000;
const B64 = /^[A-Za-z0-9+/]+={0,2}$/;
const BAD = "Gambar referensi tidak valid.";

export function parseImages(raw: unknown): RefImage[] | string {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) return BAD;
  if (raw.length > MAX_REF_IMAGES) return `Maksimal ${MAX_REF_IMAGES} gambar referensi.`;
  const out: RefImage[] = [];
  let total = 0;
  for (const item of raw) {
    const o = item as { mime?: unknown; data?: unknown } | null;
    if (!o || o.mime !== "image/jpeg" || typeof o.data !== "string" || o.data.length === 0) return BAD;
    if (o.data.length > MAX_B64_EACH) return "Gambar referensi terlalu besar.";
    if (!o.data.startsWith("/9j/") || !B64.test(o.data)) return BAD;
    total += o.data.length;
    if (total > MAX_B64_TOTAL) return "Gambar referensi terlalu besar.";
    out.push({ mime: "image/jpeg", data: o.data });
  }
  return out;
}
