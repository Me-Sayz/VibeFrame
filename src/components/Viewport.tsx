"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { btn, card } from "./ui";
import { RATIOS, type Ratio } from "@/types";

const IDLE_MS = 2500;

interface Props {
  containerRef: RefObject<HTMLDivElement | null>;
  hasResult: boolean;
  ratio: Ratio;
  duration: number;
  loadingLabel: string | null;
  playing: boolean;
  time: number;
  onToggle: () => void;
  onSeek: (t: number) => void;
  onRestart: () => void;
}

export default function Viewport(p: Props) {
  const { w, h } = RATIOS[p.ratio];
  const rootRef = useRef<HTMLDivElement>(null);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [native, setNative] = useState(false);
  const [pseudo, setPseudo] = useState(false);
  const [awake, setAwake] = useState(true);
  const full = native || pseudo;
  const showControls = !full || awake || !p.playing;

  const wake = useCallback(() => {
    setAwake(true);
    if (idle.current) clearTimeout(idle.current);
    idle.current = setTimeout(() => setAwake(false), IDLE_MS);
  }, []);

  useEffect(() => {
    const onChange = () => setNative(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    if (full) wake();
    return () => {
      if (idle.current) clearTimeout(idle.current);
    };
  }, [full, wake]);

  useEffect(() => {
    if (!pseudo) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPseudo(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [pseudo]);

  const enterFull = async () => {
    const el = rootRef.current;
    if (el?.requestFullscreen) {
      try {
        await el.requestFullscreen();
        return;
      } catch {}
    }
    setPseudo(true);
  };

  const exitFull = async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {}
    }
    setPseudo(false);
  };

  const loading = !!p.loadingLabel;

  return (
    <div
      ref={rootRef}
      onPointerMove={full ? wake : undefined}
      onPointerDown={full ? wake : undefined}
      className={
        full
          ? `relative flex h-full w-full items-center justify-center bg-black ${pseudo ? "fixed inset-0 z-[60]" : ""} ${
              showControls ? "" : "cursor-none"
            }`
          : `${card} p-3`
      }
    >
      <div className={full ? "hidden" : "mb-3 flex items-center justify-between gap-2"}>
        <h2 className="rounded-md border-[3px] border-ink bg-sky px-2 py-0.5 text-xs font-bold uppercase text-black">
          Live Viewport
        </h2>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs">
            {w}×{h}
          </span>
          <button onClick={enterFull} disabled={!p.hasResult} className={btn.small} aria-label="Layar penuh">
            ⛶ Penuh
          </button>
        </div>
      </div>

      <div className={full ? "" : "rounded-lg border-[3px] border-ink bg-[#2a2a30] p-2"}>
        <div
          className={`relative mx-auto overflow-hidden bg-black ${full ? "" : "border-[3px] border-ink"}`}
          style={{
            aspectRatio: `${w} / ${h}`,
            width: full ? `min(100vw, calc(100vh * ${w} / ${h}))` : `min(100%, calc(60vh * ${w} / ${h}))`,
          }}
        >
          <div ref={p.containerRef} className="absolute inset-0" />

          {!p.hasResult && !loading && (
            <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm font-bold text-white/60">
              Preview animasi tampil di sini
            </div>
          )}

          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-sun p-4 text-center text-black">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-black border-t-transparent" />
              <p className="text-sm font-bold">{p.loadingLabel}</p>
            </div>
          )}
        </div>
      </div>

      {full && showControls && (
        <button onClick={exitFull} className={`${btn.small} absolute right-3 top-3 z-10`} aria-label="Keluar layar penuh">
          ✕ Keluar
        </button>
      )}

      <div
        className={
          full
            ? `absolute inset-x-0 bottom-0 z-10 flex items-center gap-2 bg-gradient-to-t from-black/80 to-transparent p-4 text-white transition-opacity ${
                showControls ? "opacity-100" : "pointer-events-none opacity-0"
              }`
            : "mt-3 flex items-center gap-2"
        }
      >
        <button onClick={p.onToggle} disabled={!p.hasResult} className={btn.small}>
          {p.playing ? "⏸ Pause" : "▶ Play"}
        </button>
        <button onClick={p.onRestart} disabled={!p.hasResult} className={btn.small} aria-label="Ulang dari awal">
          ↺
        </button>
        <input
          type="range"
          min={0}
          max={p.duration}
          step={0.01}
          value={Math.min(p.time, p.duration)}
          disabled={!p.hasResult}
          onChange={(e) => p.onSeek(Number(e.target.value))}
          className="h-3 min-w-0 flex-1"
          aria-label="Timeline"
        />
        <span className="w-24 shrink-0 text-right font-mono text-xs">
          {p.time.toFixed(2)}s / {p.duration}s
        </span>
      </div>
    </div>
  );
}