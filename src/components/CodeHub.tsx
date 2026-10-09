"use client";

import { useMemo, type KeyboardEvent } from "react";
import { lintCode } from "@/lib/lint";
import { btn, mono } from "./ui";

interface Props {
  code: string;
  onChange: (value: string) => void;
  onRender: () => void;
  onPaste: () => void;
  disabled?: boolean;
}

const BADGE = {
  empty: { style: "bg-card text-ink", label: "Kosong" },
  clean: { style: "bg-lime text-black", label: "Clean" },
  error: { style: "bg-pink text-black", label: "Error" },
} as const;

export default function CodeHub({ code, onChange, onRender, onPaste, disabled }: Props) {
  const lint = useMemo(() => lintCode(code), [code]);
  const badge = BADGE[lint.level];
  const canRender = lint.level === "clean" && !disabled;

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && canRender) {
      e.preventDefault();
      onRender();
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
        placeholder="function draw(ctx, time, width, height) { ... }"
        className={mono}
        aria-label="Kode draw()"
      />

      <div className={`flex items-start gap-2 rounded-lg border-[3px] border-ink px-3 py-2 text-xs font-bold ${badge.style}`}>
        <span className="shrink-0 rounded border-2 border-current px-1.5 uppercase">{badge.label}</span>
        <span className="min-w-0 break-words font-mono font-normal">{lint.message}</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => onChange("")} disabled={!code} className={btn.small}>
          Clear
        </button>
        <button onClick={onPaste} className={btn.small}>
          📋 Paste
        </button>
        <button onClick={onRender} disabled={!canRender} className={btn.smallSun}>
          ▶ Render
        </button>
      </div>

      <p className="text-xs opacity-70">Pintasan: Ctrl+Enter untuk Render saat badge Clean.</p>
    </div>
  );
}