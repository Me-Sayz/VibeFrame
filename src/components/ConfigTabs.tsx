"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { BIG_FILE_MB, PRESETS, estimateMB, renderParams, type PresetId } from "@/lib/presets";
import { RATIO_KEYS, type LogEntry, type Ratio } from "@/types";
import type { AssetLayer, Cutout } from "@/types/assets";
import AssetsPanel from "./AssetsPanel";
import CoverPanel from "./CoverPanel";
import { btn, card, field } from "./ui";

const FPS_OPTIONS = [24, 30, 60];

const TABS = [
  { id: "config", label: "⚙️ Config" },
  { id: "assets", label: "🖼️ Assets" },
  { id: "cover", label: "🎞️ Cover" },
  { id: "logs", label: "📜 Logs" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface Props {
  duration: number;
  onDuration: (value: number) => void;
  ratio: Ratio;
  onRatio: (value: Ratio) => void;
  fps: number;
  onFps: (value: number) => void;
  preset: PresetId;
  onPreset: (value: PresetId) => void;
  rendering: boolean;
  logs: LogEntry[];
  onClearLogs: () => void;
  coverSource: { code: string; ratio: Ratio } | null;
  coverTime: number;
  coverMax: number;
  playerTime: number;
  coverBusy: boolean;
  onCoverTime: (value: number) => void;
  onSaveCover: () => void;
  layers: AssetLayer[];
  onAddLayers: (files: File[]) => void;
  onRemoveLayer: (id: string) => void;
  onRenameLayer: (id: string, raw: string) => void;
  onLayerNote: (id: string, note: string) => void;
  onMoveLayer: (id: string, dir: -1 | 1) => void;
  onLayerCutout: (id: string, cutout: Cutout) => void;
}

const stamp = (t: number) => new Date(t).toTimeString().slice(0, 8);
const logLine = (l: LogEntry) => `[${stamp(l.time)}] [${l.level.toUpperCase()}] ${l.text}`;

export default function ConfigTabs(p: Props) {
  const base = useId();
  const [tab, setTab] = useState<TabId>("config");
  const [copied, setCopied] = useState<"idle" | "ok" | "fail">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const out = renderParams(p.ratio, p.preset);
  const sizeMB = estimateMB(out.bitrate, p.duration);
  const errors = p.logs.filter((l) => l.level === "error").length;

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    else return;
    e.preventDefault();
    setTab(TABS[next].id);
    document.getElementById(`${base}-${TABS[next].id}`)?.focus();
  };

  const copyLogs = async () => {
    let next: "ok" | "fail" = "ok";
    try {
      await navigator.clipboard.writeText(p.logs.map(logLine).join("\n"));
    } catch {
      next = "fail";
    }
    setCopied(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied("idle"), 2500);
  };

  return (
    <div className={`${card} p-3`}>
      <div role="tablist" aria-label="Panel pengaturan" className="mb-3 grid grid-cols-4 gap-1.5">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            id={`${base}-${t.id}`}
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`${base}-panel`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`rounded-lg border-[3px] border-ink px-1 py-1.5 text-[11px] font-bold transition ${
              tab === t.id ? "bg-sun text-black shadow-brut-sm" : "bg-card text-ink hover:bg-lime hover:text-black"
            }`}
          >
            {t.label}
            {t.id === "logs" && p.logs.length > 0 && (
              <span className={`ml-1 rounded px-1 text-[10px] ${errors ? "bg-pink text-black" : "bg-ink text-card"}`}>
                {p.logs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-${tab}`} className="space-y-4">
        {tab === "config" && (
          <>
            <div>
              <div className="mb-1 flex justify-between text-xs font-bold uppercase">
                <span>Durasi</span>
                <span>{p.duration} detik</span>
              </div>
              <input
                type="range"
                min={3}
                max={30}
                value={p.duration}
                onChange={(e) => p.onDuration(Number(e.target.value))}
                className="w-full"
                aria-label="Durasi"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase">Rasio</span>
                <select className={field} value={p.ratio} onChange={(e) => p.onRatio(e.target.value as Ratio)}>
                  {RATIO_KEYS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase">Frame rate</span>
                <select
                  className={field}
                  value={p.fps}
                  disabled={p.rendering}
                  onChange={(e) => p.onFps(Number(e.target.value))}
                >
                  {FPS_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f} fps
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div>
              <span className="mb-1 block text-xs font-bold uppercase">Resolusi MP4</span>
              <div role="group" aria-label="Preset resolusi" className="grid grid-cols-2 gap-1.5">
                {PRESETS.map((pr) => {
                  const x = renderParams(p.ratio, pr.id);
                  const active = p.preset === pr.id;
                  return (
                    <button
                      key={pr.id}
                      onClick={() => p.onPreset(pr.id)}
                      disabled={p.rendering}
                      aria-pressed={active}
                      className={`rounded-lg border-[3px] border-ink px-2 py-1.5 text-left transition disabled:opacity-50 ${
                        active ? "bg-sun text-black shadow-brut-sm" : "bg-card text-ink enabled:hover:bg-lime enabled:hover:text-black"
                      }`}
                    >
                      <span className="block text-xs font-bold">{pr.label}</span>
                      <span className="block font-mono text-[10px]">
                        {x.width}×{x.height} · {+(x.bitrate / 1e6).toFixed(1)} Mbps
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="font-mono text-xs">
              MP4 berikutnya: {out.width}×{out.height} · {p.fps} fps · {p.duration} detik
            </p>
            <p className="font-mono text-xs">Perkiraan ukuran: ±{sizeMB < 10 ? sizeMB.toFixed(1) : Math.round(sizeMB)} MB</p>
            {sizeMB > BIG_FILE_MB && (
              <p role="status" className="rounded-lg border-[3px] border-ink bg-pink p-2 text-xs font-bold text-black">
                Ukuran besar: seluruh video disimpan di memori saat render. Kalau browser berat atau gagal, pilih resolusi lebih
                kecil atau durasi lebih pendek.
              </p>
            )}
            <p className="text-xs opacity-70">
              Durasi dan rasio dipakai saat kamu menekan Render kode. Preview yang sedang berjalan tidak berubah sebelum itu.
              Frame rate dan resolusi dipakai saat Render MP4.
            </p>
          </>
        )}

        {tab === "assets" && (
          <AssetsPanel
            layers={p.layers}
            onAdd={p.onAddLayers}
            onRemove={p.onRemoveLayer}
            onRename={p.onRenameLayer}
            onNote={p.onLayerNote}
            onMove={p.onMoveLayer}
            onCutout={p.onLayerCutout}
          />
        )}

        {tab === "cover" && (
          <CoverPanel
            source={p.coverSource}
            time={p.coverTime}
            max={p.coverMax}
            playerTime={p.playerTime}
            size={renderParams(p.coverSource?.ratio ?? p.ratio, p.preset)}
            busy={p.coverBusy}
            locked={p.rendering}
            onTime={p.onCoverTime}
            onSave={p.onSaveCover}
          />
        )}

        {tab === "logs" && (
          <>
            <div className="flex gap-2">
              <button onClick={copyLogs} disabled={!p.logs.length} className={btn.small}>
                {copied === "ok" ? "✓ Tersalin" : "📋 Salin log"}
              </button>
              <button onClick={p.onClearLogs} disabled={!p.logs.length} className={btn.small}>
                Hapus
              </button>
            </div>
            {copied === "fail" && (
              <p role="status" className="text-xs font-bold">
                Browser menolak menyalin otomatis.
              </p>
            )}
            {p.logs.length === 0 ? (
              <p className="text-xs opacity-70">Belum ada log. Riwayat render dan error muncul di sini.</p>
            ) : (
              <ul className="max-h-64 space-y-1 overflow-auto font-mono text-xs" aria-label="Daftar log">
                {[...p.logs].reverse().map((l) => (
                  <li
                    key={l.id}
                    className={`border-l-[6px] py-0.5 pl-2 ${l.level === "error" ? "border-pink" : "border-lime"}`}
                  >
                    <span className="opacity-60">{stamp(l.time)}</span> {l.text}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}