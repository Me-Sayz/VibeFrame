"use client";

import { useEffect, useRef, useState } from "react";
import { previewScale, renderCover } from "@/lib/cover";
import type { Ratio } from "@/types";
import { btn, mono } from "./ui";

const DEBOUNCE_MS = 250;

interface Props {
  source: { code: string; ratio: Ratio } | null;
  time: number;
  max: number;
  playerTime: number;
  size: { width: number; height: number };
  busy: boolean;
  locked: boolean;
  onTime: (v: number) => void;
  onSave: () => void;
}

export default function CoverPanel({
  source,
  time,
  max,
  playerTime,
  size,
  busy,
  locked,
  onTime,
  onSave,
}: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  const code = source?.code;
  const ratio = source?.ratio;

  useEffect(() => {
    if (code === undefined || ratio === undefined) return;
    let stale = false;
    const id = setTimeout(() => {
      renderCover({ code, ratio, time, scale: previewScale(ratio) })
        .then((out) => {
          if (stale) return;
          const next = URL.createObjectURL(out.blob);
          if (urlRef.current) URL.revokeObjectURL(urlRef.current);
          urlRef.current = next;
          setUrl(next);
          setErr(null);
        })
        .catch((e: unknown) => {
          if (stale) return;
          setErr(e instanceof Error ? e.message : String(e));
        });
    }, DEBOUNCE_MS);
    return () => {
      stale = true;
      clearTimeout(id);
    };
  }, [code, ratio, time]);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    },
    [],
  );

  if (!source) {
    return (
      <p className="text-sm opacity-70">
        Render kode dulu di Terminal, lalu pilih detik yang jadi cover.
      </p>
    );
  }

  const shown = Math.min(Math.max(time, 0), max);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center overflow-hidden rounded-lg border-[3px] border-ink bg-paper">
        {err ? (
          <p className="p-4 text-center text-sm font-bold">Pratinjau gagal: {err}</p>
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={`Pratinjau cover pada detik ${shown.toFixed(2)}`}
            className="max-h-64 w-auto max-w-full"
          />
        ) : (
          <p className="p-6 text-sm opacity-70">Membuat pratinjau...</p>
        )}
      </div>

      <label className="block">
        <span className="mb-1 flex items-center justify-between text-xs font-bold">
          <span>Detik cover</span>
          <span className={mono}>{shown.toFixed(2)} s</span>
        </span>
        <input
          type="range"
          min={0}
          max={max}
          step={0.01}
          value={shown}
          onChange={(e) => onTime(Number(e.target.value))}
          className="w-full accent-[var(--ink,#000)]"
        />
      </label>

      <button type="button" onClick={() => onTime(Math.min(Math.max(playerTime, 0), max))} className={btn.small}>
        ⏱ Pakai posisi timeline ({playerTime.toFixed(2)} s)
      </button>

      <p className="text-xs opacity-70">
        PNG: {size.width}×{size.height} (mengikuti resolusi MP4)
      </p>

      <button
        type="button"
        onClick={onSave}
        disabled={busy || locked}
        className={`${btn.primary} w-full`}
      >
        {busy ? "Menyimpan..." : "🖼️ Simpan cover PNG"}
      </button>
      {locked && <p className="text-xs font-bold">Menunggu render MP4 selesai.</p>}
    </div>
  );
}