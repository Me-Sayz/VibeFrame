import { BufferTarget, CanvasSource, Mp4OutputFormat, Output, Quality, canEncodeVideo } from "mediabunny";
import type { AssetLayer } from "@/types/assets";
import { createFrameWorker } from "./frameWorker";
import { outputSize } from "./presets";
import type { Ratio } from "@/types";

const BASE_BITRATE = 25_000_000;

export interface RenderOptions {
  code: string;
  ratio: Ratio;
  duration: number;
  fps: number;
  scale?: number;
  bitrate?: number;
  assets?: AssetLayer[];
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
}

export interface RenderOutput {
  blob: Blob;
  width: number;
  height: number;
  frames: number;
}

export const isAbort = (e: unknown) => e instanceof DOMException && e.name === "AbortError";

export async function renderMp4(o: RenderOptions): Promise<RenderOutput> {
  if (typeof VideoEncoder === "undefined" || typeof OffscreenCanvas === "undefined" || typeof Worker === "undefined") {
    throw new Error("Browser ini belum mendukung render MP4. Gunakan Chrome atau Edge terbaru.");
  }

  const scale = o.scale ?? 1;
  const { width, height } = outputSize(o.ratio, scale);
  const total = Math.max(1, Math.round(o.duration * o.fps));
  const bitrate = o.bitrate ?? Math.round((BASE_BITRATE * width * height) / (1920 * 1080));
  const quality = new Quality({ bitrate });

  if (!(await canEncodeVideo("avc", { width, height, quality }))) {
    throw new Error(`Browser tidak bisa meng-encode H.264 pada ${width}×${height}. Coba resolusi lebih kecil.`);
  }

  const worker = await createFrameWorker(o.code, width, height, undefined, o.assets);
  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target });
  let finished = false;

  try {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Gagal membuat canvas render.");

    const source = new CanvasSource(canvas, { codec: "avc", quality });
    output.addVideoTrack(source, { frameRate: o.fps });
    await output.start();

    for (let i = 0; i < total; i++) {
      if (o.signal?.aborted) throw new DOMException("Render dibatalkan.", "AbortError");
      const bitmap = await worker.frame(i / o.fps);
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
      await source.add(i / o.fps, 1 / o.fps);
      o.onProgress?.(i + 1, total);
    }

    await output.finalize();
    finished = true;
    if (!target.buffer) throw new Error("Hasil render kosong.");
    return { blob: new Blob([target.buffer], { type: "video/mp4" }), width, height, frames: total };
  } catch (e) {
    if (!finished) await output.cancel().catch(() => {});
    throw e;
  } finally {
    worker.close();
  }
}