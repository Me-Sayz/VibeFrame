import { MAX_FILE_MB, MAX_LAYERS, MAX_SIDE, type AssetLayer } from "@/types/assets";

const RASTER = ["image/png", "image/jpeg", "image/webp"];
const SVG = "image/svg+xml";
const SVG_MIN_SIDE = 1024;

export const ACCEPT = [...RASTER, SVG].join(",");

export function sanitizeName(raw: string): string {
  let n = raw.replace(/\.[^.]*$/, "").replace(/[^A-Za-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  if (!n) n = "layer";
  if (/^[0-9]/.test(n)) n = `_${n}`;
  return n;
}

export function uniqueName(raw: string, taken: string[]): string {
  const base = sanitizeName(raw);
  if (!taken.includes(base)) return base;
  let i = 2;
  while (taken.includes(`${base}_${i}`)) i++;
  return `${base}_${i}`;
}

export function fitSize(w: number, h: number, vector: boolean): { width: number; height: number } {
  const side = Math.max(w, h);
  const target = vector ? Math.min(Math.max(side, SVG_MIN_SIDE), MAX_SIDE) : Math.min(side, MAX_SIDE);
  const k = target / side;
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) };
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function decodeSvg(file: File): Promise<{ bitmap: ImageBitmap; width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const natW = img.naturalWidth || 512;
    const natH = img.naturalHeight || 512;
    const { width, height } = fitSize(natW, natH, true);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Browser tidak bisa membuat kanvas untuk SVG.");
    ctx.drawImage(img, 0, 0, width, height);
    return { bitmap: await createImageBitmap(canvas), width, height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function decodeRaster(file: File): Promise<{ bitmap: ImageBitmap; width: number; height: number }> {
  const first = await createImageBitmap(file);
  const { width, height } = fitSize(first.width, first.height, false);
  if (width === first.width && height === first.height) return { bitmap: first, width, height };
  first.close();
  const bitmap = await createImageBitmap(file, { resizeWidth: width, resizeHeight: height, resizeQuality: "high" });
  return { bitmap, width: bitmap.width, height: bitmap.height };
}

export async function loadLayer(file: File, taken: string[]): Promise<AssetLayer> {
  if (taken.length >= MAX_LAYERS) throw new Error(`Maksimal ${MAX_LAYERS} layer. Hapus salah satu dulu.`);
  const isSvg = file.type === SVG;
  if (!isSvg && !RASTER.includes(file.type)) {
    throw new Error(`"${file.name}" bukan PNG, JPG, WebP, atau SVG.`);
  }
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    throw new Error(`"${file.name}" lebih dari ${MAX_FILE_MB} MB.`);
  }
  let decoded;
  try {
    decoded = isSvg ? await decodeSvg(file) : await decodeRaster(file);
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e);
    throw new Error(`"${file.name}" gagal dibaca: ${why}`);
  }
  return {
    id: newId(),
    name: uniqueName(file.name, taken),
    note: "",
    width: decoded.width,
    height: decoded.height,
    bitmap: decoded.bitmap,
  };
}