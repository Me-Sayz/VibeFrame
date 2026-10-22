"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { PREVIEW_BGS, PREVIEW_BG_IDS, type PreviewBg } from "@/lib/vectorView";
import type { LogEntry } from "@/types";
import type { AssetLayer } from "@/types/assets";
import VectorColors from "./VectorColors";
import VectorRefs from "./VectorRefs";
import { btn, card } from "./ui";

const TABS = [
  { id: "config", icon: "⚙️", label: "Config" },
  { id: "refs", icon: "🖼️", label: "Referensi" },
  { id: "logs", icon: "📜", label: "Logs" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface Props {
  svg: string;
  onSvgChange: (svg: string, group?: string) => void;
  selected: number | null;
  onSelect: (index: number | null) => void;
  onHover: (indices: number[] | null) => void;
  previewBg: PreviewBg;
  onPreviewBg: (value: PreviewBg) => void;
  refs: AssetLayer[];
  onAddRefs: (files: File[]) => void;
  onRemoveRef: (id: string) => void;
  onRefNote: (id: string, note: string) => void;
  onUseAi: () => void;
  logs: LogEntry[];
  onClearLogs: () => void;
}

const stamp = (t: number) => new Date(t).toTimeString().slice(0, 8);
const logLine = (l: LogEntry) => `[${stamp(l.time)}] [${l.level.toUpperCase()}] ${l.text}`;

export default function VectorConfig(p: Props) {
  const base = useId();
  const [tab, setTab] = useState<TabId>("config");
  const [copied, setCopied] = useState<"idle" | "ok" | "fail">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

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
      <div role="tablist" aria-label="Panel pengaturan vector" className="mb-3 grid grid-cols-3 gap-1">
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
            className={`relative rounded-lg border-[3px] border-ink px-0.5 py-1.5 text-[10px] font-bold leading-tight transition ${
              tab === t.id ? "bg-sun text-black shadow-brut-sm" : "bg-card text-ink hover:bg-lime hover:text-black"
            }`}
          >
            <span className="block text-sm leading-none">{t.icon}</span> <span className="block">{t.label}</span>
            {t.id === "logs" && p.logs.length > 0 && (
              <span
                className={`absolute -right-1 -top-2 rounded px-1 text-[9px] leading-tight ${errors ? "bg-pink text-black" : "bg-ink text-card"}`}
              >
                {p.logs.length}
              </span>
            )}
            {t.id === "refs" && p.refs.length > 0 && (
              <span className="absolute -right-1 -top-2 rounded bg-ink px-1 text-[9px] leading-tight text-card">
                {p.refs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-${tab}`} className="space-y-4">
        {tab === "config" && (
          <>
            <div>
              <span className="mb-1 block text-xs font-bold uppercase">Latar pratinjau</span>
              <div role="group" aria-label="Latar pratinjau" className="grid grid-cols-2 gap-1.5">
                {PREVIEW_BG_IDS.map((id) => (
                  <button
                    key={id}
                    onClick={() => p.onPreviewBg(id)}
                    aria-pressed={p.previewBg === id}
                    className={`rounded-lg border-[3px] border-ink px-2 py-1.5 text-xs font-bold transition ${
                      p.previewBg === id ? "bg-sun text-black shadow-brut-sm" : "bg-card text-ink hover:bg-lime hover:text-black"
                    }`}
                  >
                    {PREVIEW_BGS[id].label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs opacity-70">Hanya mengubah tampilan di layar, tidak ikut ke file yang diunduh.</p>
            </div>

            {p.svg ? (
              <VectorColors
                svg={p.svg}
                onChange={p.onSvgChange}
                onHover={p.onHover}
                selected={p.selected}
                onSelect={p.onSelect}
              />
            ) : (
              <p className="text-xs opacity-70">
                Belum ada gambar. Buat lewat 📝 Prompt AI, atau tempel kode SVG di 🖥️ Terminal. Setelah itu warna tiap bagian
                bisa diubah di sini.
              </p>
            )}
          </>
        )}

        {tab === "refs" && (
          <VectorRefs refs={p.refs} onAdd={p.onAddRefs} onRemove={p.onRemoveRef} onNote={p.onRefNote} onUseAi={p.onUseAi} />
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
              <p className="text-xs opacity-70">Belum ada log. Riwayat pembuatan dan error muncul di sini.</p>
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
