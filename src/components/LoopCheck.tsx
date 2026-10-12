"use client";

import { useEffect, useRef, useState } from "react";
import { checkLoop, type LoopLevel, type LoopReport, type Pixels } from "@/lib/loop";
import { isAbort } from "@/lib/render";
import type { MotionResult } from "@/types";
import { btn, sectionTitle } from "./ui";

interface Props {
  source: MotionResult | null;
  fps: number;
  check?: typeof checkLoop;
}

const VERDICT: Record<LoopLevel, { label: string; style: string; text: string }> = {
  smooth: {
    label: "✅ Mulus",
    style: "bg-lime",
    text: "Perpindahan dari frame terakhir ke frame pertama sama halusnya dengan gerakan biasa. Aman untuk diputar berulang.",
  },
  minor: {
    label: "⚠️ Ada sedikit loncatan",
    style: "bg-sun",
    text: "Sambungannya sedikit terasa. Banyak penonton tidak sadar, tapi lebih baik diperbaiki sebelum diunggah.",
  },
  jump: {
    label: "❌ Tidak nyambung",
    style: "bg-pink",
    text: "Frame terakhir sangat berbeda dari frame pertama, jadi video akan terlihat loncat saat diulang.",
  },
};

function Thumb({ pixels, label }: { pixels: Pixels; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(new ImageData(new Uint8ClampedArray(pixels.data), pixels.width, pixels.height), 0, 0);
  }, [pixels]);
  return (
    <figure className="min-w-0 space-y-1">
      <canvas
        ref={ref}
        width={pixels.width}
        height={pixels.height}
        className="h-auto w-full rounded-lg border-[3px] border-ink bg-ink"
        aria-label={label}
      />
      <figcaption className="text-center text-[10px] font-bold uppercase">{label}</figcaption>
    </figure>
  );
}

export default function LoopCheck({ source, fps, check = checkLoop }: Props) {
  const [report, setReport] = useState<LoopReport | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const checkedRun = useRef<number | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const run = async () => {
    if (!source || abortRef.current) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setError(null);
    setProgress(0);
    try {
      const out = await check({
        code: source.code,
        ratio: source.ratio,
        duration: source.duration,
        fps,
        assets: source.assets,
        signal: controller.signal,
        onProgress: (done, total) => setProgress(Math.round((done / total) * 100)),
      });
      setReport(out);
      checkedRun.current = source.runId;
    } catch (e) {
      if (!isAbort(e)) setError(e instanceof Error ? e.message : String(e));
    } finally {
      abortRef.current = null;
      setProgress(null);
    }
  };

  const stale = report !== null && source !== null && checkedRun.current !== source.runId;
  const verdict = report ? VERDICT[report.level] : null;

  return (
    <section className="space-y-3" aria-label="Cek loop">
      <span className={sectionTitle}>🔁 Cek loop</span>
      <p className="text-xs opacity-70">
        Membandingkan frame terakhir dengan frame pertama dari animasi yang sedang tampil. Video stok yang bisa di-loop
        biasanya lebih diminati. Gratis dan tidak memakai AI.
      </p>

      {!source ? (
        <p className="rounded-lg border-[3px] border-ink bg-paper p-2 text-xs font-bold">
          Belum ada animasi. Render kode dulu, lalu cek loop.
        </p>
      ) : progress !== null ? (
        <div className="space-y-1">
          <div className="h-5 overflow-hidden rounded-lg border-[3px] border-ink bg-card">
            <div className="h-full bg-lime transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span role="status" className="text-xs font-bold">
              Memeriksa… {progress}%
            </span>
            <button onClick={() => abortRef.current?.abort()} className={btn.small}>
              ✕ Batal
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => void run()} className={btn.smallSun}>
          {report ? "↻ Cek ulang" : "▶ Cek loop sekarang"}
        </button>
      )}

      {error && (
        <p role="alert" className="rounded-lg border-[3px] border-ink bg-pink p-2 text-xs font-bold text-black">
          {error}
        </p>
      )}

      {report && verdict && (
        <div className="space-y-3">
          {stale && (
            <p role="status" className="rounded-lg border-[3px] border-ink bg-sun p-2 text-xs font-bold text-black">
              Animasi sudah berubah sejak pemeriksaan ini. Klik Cek ulang.
            </p>
          )}
          <div className={`space-y-1 rounded-lg border-[3px] border-ink p-3 text-black ${verdict.style}`}>
            <p className="text-sm font-bold">{verdict.label}</p>
            <p className="text-xs">{verdict.text}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Thumb pixels={report.last} label="Frame terakhir" />
            <Thumb pixels={report.first} label="Frame pertama" />
            <Thumb pixels={report.diff} label="Selisih" />
          </div>
          <p className="font-mono text-[11px] opacity-80">
            Selisih sambungan {report.seam.toFixed(1)} · selisih antar frame biasanya {report.typical.toFixed(1)}, tertinggi {report.peak.toFixed(1)} (skala 0–255)
          </p>
          {report.level !== "smooth" && (
            <p className="text-xs">
              Cara memperbaiki: buka tab <b>✨ AI</b> di panel kiri, klik <b>Buat loop mulus</b>, lalu <b>Terapkan perubahan</b>.
              Atau buat ulang dengan kotak <b>🔁 Loop mulus</b> aktif di Prompt AI.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
