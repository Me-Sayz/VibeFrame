"use client";

import { useMemo, useState } from "react";
import { getParts, recolor, setPartColor, type Paint, type SvgPart } from "@/lib/svg";
import { btn, sectionTitle } from "./ui";

interface Props {
  svg: string;
  onChange: (svg: string) => void;
  onHover: (indices: number[] | null) => void;
}

type Mode = "shape" | "color";
type Prop = "fill" | "stroke";

const AUTO_COLOR_MODE_FROM = 15;

interface Group {
  prop: Prop;
  hex: string;
  indices: number[];
}

function groupByColor(parts: SvgPart[]): Group[] {
  const map = new Map<string, Group>();
  for (const p of parts) {
    for (const prop of ["fill", "stroke"] as const) {
      const paint = p[prop];
      if (paint.kind !== "color") continue;
      const key = `${prop}:${paint.hex}`;
      const g = map.get(key) ?? { prop, hex: paint.hex, indices: [] };
      g.indices.push(p.index);
      map.set(key, g);
    }
  }
  return [...map.values()];
}

const note = (paint: Paint) => (paint.kind === "none" ? "tanpa" : "gradasi/lain");

function Swatch({ label, hex, onPick }: { label: string; hex: string; onPick: (hex: string) => void }) {
  return (
    <label className="flex items-center gap-1 text-[10px] font-bold uppercase">
      <input
        type="color"
        value={hex}
        onChange={(e) => onPick(e.target.value)}
        aria-label={label}
        className="h-7 w-9 cursor-pointer rounded border-[3px] border-ink bg-card p-0"
      />
      <span className="font-mono normal-case opacity-70">{hex}</span>
    </label>
  );
}

export default function VectorColors({ svg, onChange, onHover }: Props) {
  const parts = useMemo(() => getParts(svg), [svg]);
  const [forced, setForced] = useState<Mode | null>(null);
  const mode: Mode = forced ?? (parts.length > AUTO_COLOR_MODE_FROM ? "color" : "shape");
  const groups = useMemo(() => groupByColor(parts), [parts]);

  const apply = (next: string | null) => {
    if (next) onChange(next);
  };

  if (parts.length === 0) {
    return <p className="text-xs opacity-70">Belum ada bentuk yang bisa diubah warnanya.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={sectionTitle}>🎨 Warna per bagian</span>
        <div className="flex gap-1.5" role="group" aria-label="Cara mengelompokkan">
          <button
            onClick={() => setForced("shape")}
            aria-pressed={mode === "shape"}
            className={mode === "shape" ? btn.smallSun : btn.small}
          >
            Per bentuk ({parts.length})
          </button>
          <button
            onClick={() => setForced("color")}
            aria-pressed={mode === "color"}
            className={mode === "color" ? btn.smallSun : btn.small}
          >
            Per warna ({groups.length})
          </button>
        </div>
      </div>
      <p className="text-xs opacity-70">
        {mode === "shape"
          ? "Tiap bentuk punya warnanya sendiri. Arahkan kursor ke baris untuk melihat bentuknya di preview."
          : "Bentuk yang warnanya sama berubah bersamaan. Pakai Per bentuk kalau mau memisahkannya."}
      </p>

      <ul className="max-h-72 space-y-1.5 overflow-auto pr-1">
        {mode === "shape"
          ? parts.map((p) => (
              <li
                key={p.index}
                onMouseEnter={() => onHover([p.index])}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover([p.index])}
                onBlur={() => onHover(null)}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border-[3px] border-ink bg-paper px-2 py-1.5"
              >
                <span className="min-w-0 truncate text-xs font-bold">{p.label}</span>
                <span className="flex flex-wrap items-center gap-2">
                  {p.fill.kind === "color" ? (
                    <Swatch
                      label={`Warna isi ${p.label}`}
                      hex={p.fill.hex}
                      onPick={(hex) => apply(setPartColor(svg, p.index, "fill", hex))}
                    />
                  ) : (
                    <span className="text-[10px] opacity-70">isi: {note(p.fill)}</span>
                  )}
                  {p.stroke.kind === "color" && (
                    <Swatch
                      label={`Warna garis ${p.label}`}
                      hex={p.stroke.hex}
                      onPick={(hex) => apply(setPartColor(svg, p.index, "stroke", hex))}
                    />
                  )}
                </span>
              </li>
            ))
          : groups.map((g) => (
              <li
                key={`${g.prop}:${g.indices[0]}`}
                onMouseEnter={() => onHover(g.indices)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(g.indices)}
                onBlur={() => onHover(null)}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border-[3px] border-ink bg-paper px-2 py-1.5"
              >
                <span className="text-xs font-bold">
                  {g.prop === "fill" ? "Isi" : "Garis"} · {g.indices.length} bentuk
                </span>
                <Swatch
                  label={`Ganti warna ${g.prop === "fill" ? "isi" : "garis"} ${g.hex}`}
                  hex={g.hex}
                  onPick={(hex) => apply(recolor(svg, g.prop, g.hex, hex))}
                />
              </li>
            ))}
      </ul>
    </div>
  );
}
