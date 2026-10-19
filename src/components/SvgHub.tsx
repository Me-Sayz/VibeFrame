"use client";

import { useDeferredValue, useMemo, type KeyboardEvent } from "react";
import { getParts, sanitizeSvg } from "@/lib/svg";
import { btn, mono } from "./ui";

interface Props {
  code: string;
  onChange: (value: string) => void;
  onShow: () => void;
  onPaste: () => void;
}

const BADGE = {
  empty: { style: "bg-card text-ink", label: "Kosong" },
  clean: { style: "bg-lime text-black", label: "Clean" },
  error: { style: "bg-pink text-black", label: "Error" },
} as const;

function check(code: string): { level: keyof typeof BADGE; message: string } {
  if (code.trim() === "") return { level: "empty", message: "Belum ada kode SVG." };
  const r = sanitizeSvg(code);
  if (!r.ok) return { level: "error", message: r.error };
  const dropped = r.removed.length > 0 ? ` · akan dibuang: ${r.removed.join(", ")}` : "";
  return { level: "clean", message: `SVG valid · ${getParts(r.svg).length} bentuk${dropped}` };
}

export default function SvgHub({ code, onChange, onShow, onPaste }: Props) {
  const deferred = useDeferredValue(code);
  const status = useMemo(() => check(deferred), [deferred]);
  const badge = BADGE[status.level];
  const canShow = status.level === "clean";

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && canShow) {
      e.preventDefault();
      onShow();
    }
  };

  return (
    <div className="space-y-3">
      <textarea
        rows={12}
        value={code}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        spellCheck={false}
        placeholder={'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"> ... </svg>'}
        className={mono}
        aria-label="Kode SVG"
      />

      <div className={`flex items-start gap-2 rounded-lg border-[3px] border-ink px-3 py-2 text-xs font-bold ${badge.style}`}>
        <span className="shrink-0 rounded border-2 border-current px-1.5 uppercase">{badge.label}</span>
        <span className="min-w-0 break-words font-mono font-normal">{status.message}</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => onChange("")} disabled={!code} className={btn.small}>
          Clear
        </button>
        <button onClick={onPaste} className={btn.small}>
          📋 Paste
        </button>
        <button onClick={onShow} disabled={!canShow} className={btn.smallSun}>
          ▶ Tampilkan
        </button>
      </div>

      <p className="text-xs opacity-70">
        Pintasan: Ctrl+Enter untuk Tampilkan saat badge Clean. Paste langsung menampilkan kalau SVG-nya valid.
      </p>
    </div>
  );
}
