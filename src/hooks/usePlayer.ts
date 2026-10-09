"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WORKER_SRC } from "@/lib/worker";
import { RATIOS, type MotionResult } from "@/types";

const WAIT_LIMIT_MS = 4000;
const UI_INTERVAL_MS = 100;

export function usePlayer(result: MotionResult | null, onError: (message: string) => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const seekRef = useRef<((t: number) => void) | null>(null);
  const playingRef = useRef(true);
  const latest = useRef({ result, onError });

  const [playing, setPlaying] = useState(true);
  const [time, setTime] = useState(0);

  useEffect(() => {
    latest.current = { result, onError };
  });

  const runId = result?.runId;

  useEffect(() => {
    const box = containerRef.current;
    const r = latest.current.result;
    if (!box || !r) return;

    const { w, h } = RATIOS[r.ratio];
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.style.cssText = "width:100%;height:100%;display:block;object-fit:contain";
    box.appendChild(canvas);

    const url = URL.createObjectURL(new Blob([WORKER_SRC], { type: "text/javascript" }));
    const worker = new Worker(url);
    const offscreen = canvas.transferControlToOffscreen();
    const layers = (r.assets ?? []).map((l) => ({ name: l.name, bitmap: l.bitmap }));
    worker.postMessage({ type: "init", canvas: offscreen, code: r.code, width: w, height: h, assets: layers }, [offscreen]);

    const s = {
      t: 0,
      busy: false,
      ready: false,
      sentAt: performance.now(),
      pending: null as number | null,
      last: performance.now(),
      uiAt: 0,
    };
    let raf = 0;
    let dead = false;

    const stop = () => {
      dead = true;
      cancelAnimationFrame(raf);
      worker.terminate();
    };
    const fail = (message: string) => {
      if (dead) return;
      stop();
      latest.current.onError(message);
    };

    const post = (t: number) => {
      if (s.busy) {
        s.pending = t;
        return;
      }
      s.busy = true;
      s.sentAt = performance.now();
      worker.postMessage({ type: "frame", t });
    };

    worker.onmessage = (e: MessageEvent) => {
      const d = e.data;
      if (d.type === "ready") {
        s.ready = true;
        post(0);
      } else if (d.type === "done") {
        s.busy = false;
        if (s.pending !== null) {
          const p = s.pending;
          s.pending = null;
          post(p);
        }
      } else if (d.type === "error") {
        fail(String(d.message));
      }
    };
    worker.onerror = (e) => fail(e.message || "Worker error");

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - s.last) / 1000, 0.1);
      s.last = now;

      if (s.ready && playingRef.current) {
        s.t = (s.t + dt) % r.duration;
        post(s.t);
        if (now - s.uiAt > UI_INTERVAL_MS) {
          s.uiAt = now;
          setTime(s.t);
        }
      }

      const waiting = !s.ready || s.busy;
      if (waiting && performance.now() - s.sentAt > WAIT_LIMIT_MS) {
        fail(
          s.ready
            ? "Animasi tidak merespons dan dihentikan (kemungkinan loop tanpa batas)."
            : "Kode tidak selesai dimuat dan dihentikan (kemungkinan loop tanpa batas)."
        );
      }
    };
    raf = requestAnimationFrame(tick);

    seekRef.current = (t) => {
      s.t = Math.max(0, Math.min(t, r.duration));
      setTime(s.t);
      if (s.ready) post(s.t);
    };

    playingRef.current = true;
    setPlaying(true);
    setTime(0);

    return () => {
      stop();
      URL.revokeObjectURL(url);
      canvas.remove();
      seekRef.current = null;
    };
  }, [runId]);

  const toggle = useCallback(() => {
    playingRef.current = !playingRef.current;
    setPlaying(playingRef.current);
  }, []);
  const seek = useCallback((t: number) => seekRef.current?.(t), []);
  const restart = useCallback(() => seekRef.current?.(0), []);

  return { containerRef, playing, time, toggle, seek, restart };
}