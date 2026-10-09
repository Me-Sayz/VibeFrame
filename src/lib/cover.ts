import type { AssetLayer } from "@/types/assets";
import { createFrameWorker } from "./frameWorker";
import { outputSize } from "./presets";
import { RATIOS, type Ratio } from "@/types";

const PREVIEW_SHORT = 360;

export interface CoverOptions {
  code: string;
  ratio: Ratio;
  time: number;
  scale?: number;
  assets?: AssetLayer[];
}

export interface CoverOutput {
  blob: Blob;
  width: number;
  height: number;
}

export function previewScale(ratio: Ratio) {
  const { w, h } = RATIOS[ratio];
  return PREVIEW_SHORT / Math.min(w, h);
}

export async function renderCover(o: CoverOptions): Promise<CoverOutput> {
  if (typeof OffscreenCanvas === "undefined" || typeof Worker === "undefined") {
    throw new Error("Browser ini belum mendukung pembuatan cover. Gunakan Chrome atau Edge terbaru.");
  }

  const { width, height } = outputSize(o.ratio, o.scale ?? 1);
  const worker = await createFrameWorker(o.code, width, height, undefined, o.assets);

  try {
    const bitmap = await worker.frame(Math.max(0, o.time));
    const ctx = new OffscreenCanvas(width, height).getContext("2d");
    if (!ctx) {
      bitmap.close();
      throw new Error("Gagal membuat canvas cover.");
    }
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const blob = await ctx.canvas.convertToBlob({ type: "image/png" });
    return { blob, width, height };
  } finally {
    worker.close();
  }
}