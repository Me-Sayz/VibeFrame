import type { AssetLayer } from "@/types/assets";
import { WORKER_SRC } from "./worker";

const FRAME_TIMEOUT_MS = 4000;

export interface FrameWorker {
  frame: (t: number) => Promise<ImageBitmap>;
  close: () => void;
}

interface Pending {
  resolve: (value: ImageBitmap | null) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export async function createFrameWorker(
  code: string,
  width: number,
  height: number,
  timeoutMs = FRAME_TIMEOUT_MS,
  assets: AssetLayer[] = []
): Promise<FrameWorker> {
  const url = URL.createObjectURL(new Blob([WORKER_SRC], { type: "text/javascript" }));
  const worker = new Worker(url);
  let pending: Pending | null = null;

  const settle = (fn: (p: Pending) => void) => {
    if (!pending) return;
    const p = pending;
    pending = null;
    clearTimeout(p.timer);
    fn(p);
  };

  worker.onmessage = (e: MessageEvent) => {
    const d = e.data;
    if (d.type === "ready") settle((p) => p.resolve(null));
    else if (d.type === "bitmap") settle((p) => p.resolve(d.bitmap as ImageBitmap));
    else if (d.type === "error") settle((p) => p.reject(new Error(String(d.message))));
  };
  worker.onerror = (e) => settle((p) => p.reject(new Error(e.message || "Worker error")));

  const ask = (message: object, transfer: Transferable[] = []) =>
    new Promise<ImageBitmap | null>((resolve, reject) => {
      const timer = setTimeout(
        () => settle((p) => p.reject(new Error("Animasi tidak merespons saat render (kemungkinan loop tanpa batas)."))),
        timeoutMs
      );
      pending = { resolve, reject, timer };
      worker.postMessage(message, transfer);
    });

  const close = () => {
    settle((p) => p.reject(new Error("Worker dihentikan.")));
    worker.terminate();
    URL.revokeObjectURL(url);
  };

  try {
    const canvas = new OffscreenCanvas(width, height);
    const layers = assets.map((a) => ({ name: a.name, bitmap: a.bitmap }));
    await ask({ type: "init", canvas, code, width, height, assets: layers }, [canvas]);
  } catch (e) {
    close();
    throw e;
  }

  return {
    frame: async (t) => {
      const bitmap = await ask({ type: "frame", t, bitmap: true });
      if (!bitmap) throw new Error("Frame kosong dari Worker.");
      return bitmap;
    },
    close,
  };
}