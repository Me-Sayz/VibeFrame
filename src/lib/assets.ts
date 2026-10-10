import { DEFAULT_TOLERANCE, MAX_FILE_MB, MAX_LAYERS, MAX_SIDE, type AssetLayer, type Cutout } from "@/types/assets";

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

export function cutoutPixels(data: Uint8ClampedArray, w: number, h: number, tolerance: number): number {
  const n = w * h;
  const thr = Math.max(0, tolerance) * 2.55;
  const thr2 = thr * thr;

  const bins = new Map<number, { c: number; r: number; g: number; b: number }>();
  const sample = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    if (data[i + 3] < 128) return;
    const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
    const bin = bins.get(key) ?? { c: 0, r: 0, g: 0, b: 0 };
    bin.c += 1;
    bin.r += data[i];
    bin.g += data[i + 1];
    bin.b += data[i + 2];
    bins.set(key, bin);
  };
  for (let x = 0; x < w; x++) {
    sample(x, 0);
    sample(x, h - 1);
  }
  for (let y = 1; y < h - 1; y++) {
    sample(0, y);
    sample(w - 1, y);
  }
  let best: { c: number; r: number; g: number; b: number } | null = null;
  for (const bin of bins.values()) if (!best || bin.c > best.c) best = bin;
  const bg = best ? [best.r / best.c, best.g / best.c, best.b / best.c] : null;

  const dist2 = (p: number) => {
    if (!bg) return Infinity;
    const i = p * 4;
    const dr = data[i] - bg[0];
    const dg = data[i + 1] - bg[1];
    const db = data[i + 2] - bg[2];
    return dr * dr + dg * dg + db * db;
  };
  const isBg = (p: number) => data[p * 4 + 3] < 16 || dist2(p) <= thr2;

  const gone = new Uint8Array(n);
  const stack = new Int32Array(n);
  let top = 0;
  const push = (p: number) => {
    if (gone[p] || !isBg(p)) return;
    gone[p] = 1;
    stack[top++] = p;
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 1; y < h - 1; y++) {
    push(y * w);
    push(y * w + w - 1);
  }
  while (top > 0) {
    const p = stack[--top];
    const x = p % w;
    if (x > 0) push(p - 1);
    if (x < w - 1) push(p + 1);
    if (p >= w) push(p - w);
    if (p < n - w) push(p + w);
  }

  let removed = 0;
  for (let p = 0; p < n; p++) {
    if (gone[p]) {
      data[p * 4 + 3] = 0;
      removed++;
    }
  }
  if (removed === 0) return 0;

  if (bg && thr > 0) {
    for (let p = 0; p < n; p++) {
      if (gone[p]) continue;
      const x = p % w;
      const touches =
        (x > 0 && gone[p - 1]) || (x < w - 1 && gone[p + 1]) || (p >= w && gone[p - w]) || (p < n - w && gone[p + w]);
      if (!touches) continue;
      const d = Math.sqrt(dist2(p));
      if (d < thr * 2) data[p * 4 + 3] = Math.round(data[p * 4 + 3] * ((d - thr) / thr));
    }
  }
  return removed / n;
}

export async function applyCutout(source: ImageBitmap, tolerance: number): Promise<ImageBitmap> {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Browser tidak bisa membuat kanvas untuk menghapus latar.");
  ctx.drawImage(source, 0, 0);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const removed = cutoutPixels(img.data, canvas.width, canvas.height, tolerance);
  if (removed === 0) throw new Error("Latar belakang tidak terdeteksi di tepi gambar. Coba naikkan toleransi.");
  if (removed > 0.98) throw new Error("Hampir seluruh gambar terhapus. Turunkan toleransi.");
  ctx.putImageData(img, 0, 0);
  return createImageBitmap(canvas);
}

export async function withCutout(layer: AssetLayer, cutout: Cutout): Promise<AssetLayer> {
  if (!cutout.on) return { ...layer, cutout, bitmap: layer.source };
  return { ...layer, cutout, bitmap: await applyCutout(layer.source, cutout.tolerance) };
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
    source: decoded.bitmap,
    cutout: { on: false, tolerance: DEFAULT_TOLERANCE },
  };
}