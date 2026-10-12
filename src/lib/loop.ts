import type { AssetLayer } from "@/types/assets";
import { RATIOS, type Ratio } from "@/types";
import { createFrameWorker, type FrameWorker } from "./frameWorker";

const SHORT_SIDE = 320;
const SAMPLES = 24;

export type LoopLevel = "smooth" | "minor" | "jump";

export interface Pixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface LoopReport {
  level: LoopLevel;
  seam: number;
  typical: number;
  peak: number;
  first: Pixels;
  last: Pixels;
  diff: Pixels;
}

export interface LoopOptions {
  code: string;
  ratio: Ratio;
  duration: number;
  fps: number;
  assets?: AssetLayer[];
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
}

export interface LoopDeps {
  createWorker: (code: string, width: number, height: number, assets?: AssetLayer[]) => Promise<FrameWorker>;
  toPixels: (bitmap: ImageBitmap, width: number, height: number) => Pixels;
}

export function meanDiff(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  const n = Math.min(a.length, b.length);
  let sum = 0;
  let count = 0;
  for (let i = 0; i + 2 < n; i += 4) {
    sum += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
    count += 3;
  }
  return count === 0 ? 0 : sum / count;
}

export function judgeLoop(seam: number, peak: number): LoopLevel {
  if (seam <= Math.max(peak * 1.25, 1)) return "smooth";
  if (seam <= Math.max(peak * 2.5, 3)) return "minor";
  return "jump";
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))];
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((x, y) => x - y);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function diffImage(a: Pixels, b: Pixels): Pixels {
  const out = new Uint8ClampedArray(a.data.length);
  for (let i = 0; i + 3 < out.length; i += 4) {
    const d = (Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2])) / 3;
    const v = Math.min(255, d * 4);
    out[i] = v;
    out[i + 1] = v * 0.25;
    out[i + 2] = v * 0.25;
    out[i + 3] = 255;
  }
  return { data: out, width: a.width, height: a.height };
}

const browserDeps: LoopDeps = {
  createWorker: (code, width, height, assets) => createFrameWorker(code, width, height, undefined, assets),
  toPixels: (bitmap, width, height) => {
    const ctx = new OffscreenCanvas(width, height).getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Gagal membuat canvas pemeriksaan.");
    ctx.drawImage(bitmap, 0, 0);
    const img = ctx.getImageData(0, 0, width, height);
    return { data: img.data, width, height };
  },
};

export async function checkLoop(o: LoopOptions, deps: LoopDeps = browserDeps): Promise<LoopReport> {
  if (deps === browserDeps && (typeof OffscreenCanvas === "undefined" || typeof Worker === "undefined")) {
    throw new Error("Browser ini belum mendukung pemeriksaan loop. Gunakan Chrome atau Edge terbaru.");
  }

  const { w, h } = RATIOS[o.ratio];
  const scale = SHORT_SIDE / Math.min(w, h);
  const width = Math.max(2, Math.round(w * scale));
  const height = Math.max(2, Math.round(h * scale));
  const total = Math.max(2, Math.round(o.duration * o.fps));
  const step = 1 / o.fps;
  const lastT = (total - 1) * step;

  const worker = await deps.createWorker(o.code, width, height, o.assets);
  const grab = async (t: number) => {
    if (o.signal?.aborted) throw new DOMException("Dibatalkan.", "AbortError");
    const bitmap = await worker.frame(Math.max(0, Math.min(lastT, t)));
    try {
      return deps.toPixels(bitmap, width, height);
    } finally {
      bitmap.close();
    }
  };

  try {
    const pairs = Math.min(SAMPLES, total - 1);
    const jobs = pairs + 2;
    let done = 0;
    const tick = () => o.onProgress?.(++done, jobs);

    const first = await grab(0);
    tick();
    const last = await grab(lastT);
    tick();
    const seam = meanDiff(last.data, first.data);

    const diffs: number[] = [];
    for (let k = 0; k < pairs; k++) {
      const t = (k * (lastT - step)) / Math.max(1, pairs - 1);
      const a = await grab(t);
      const b = await grab(t + step);
      diffs.push(meanDiff(a.data, b.data));
      tick();
    }
    const typical = median(diffs);
    const peak = percentile(diffs, 0.9);
    return { level: judgeLoop(seam, peak), seam, typical, peak, first, last, diff: diffImage(last, first) };
  } finally {
    worker.close();
  }
}

