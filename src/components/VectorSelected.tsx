"use client";

import { useMemo, useState } from "react";
import { getParts, recolor, setPartColor, type Paint } from "@/lib/svg";
import { btn } from "./ui";

interface Props {
  svg: string;
  selected: number | null;
  onChange: (svg: string, group?: string) => void;
  onSelect: (index: number | null) => void;
}

type Prop = "fill" | "stroke";

const note = (paint: Paint) => (paint.kind === "none" ? "tanpa" : "gradasi/lain");

function Swatch({ label, hex, onPick }: { label: string; hex: string; onPick: (hex: string) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs font-bold">
      <input
        type="color"
        value={hex}
        onChange={(e) => onPick(e.target.value)}
        aria-label={label}
        className="h-9 w-12 cursor-pointer rounded border-[3px] border-ink bg-card p-0"
      />
      <span className="font-mono font-normal opacity-70">{hex}</span>
    </label>
  );
}

export default function VectorSelected({ svg, selected, onChange, onSelect }: Props) {
  const parts = useMemo(() => getParts(svg), [svg]);
  const [linked, setLinked] = useState(false);
  const current = selected !== null ? parts[selected] : undefined;
  if (!current || selected === null) return null;

  const pick = (prop: Prop, from: string, hex: string) => {
    const next = linked ? recolor(svg, prop, from, hex) : setPartColor(svg, selected, prop, hex);
    if (next) onChange(next, linked ? `link:${prop}:${selected}` : `${selected}:${prop}`);
  };

  return (
    <div className="space-y-2 rounded-lg border-[3px] border-ink bg-sun p-3 text-black" aria-label="Bagian terpilih">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-sm font-bold">Terpilih: {current.label}</span>
        <button onClick={() => onSelect(null)} className={btn.small} aria-label="Lepas pilihan">
          ✕ Lepas
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-4 rounded-md border-2 border-ink bg-card p-2 text-ink">
        {current.fill.kind === "color" ? (
          <Swatch
            label={`Warna isi ${current.label}`}
            hex={current.fill.hex}
            onPick={(hex) => pick("fill", (current.fill as { hex: string }).hex, hex)}
          />
        ) : (
          <span className="text-xs opacity-70">isi: {note(current.fill)}</span>
        )}
        {current.stroke.kind === "color" && (
          <Swatch
            label={`Warna garis ${current.label}`}
            hex={current.stroke.hex}
            onPick={(hex) => pick("stroke", (current.stroke as { hex: string }).hex, hex)}
          />
        )}
      </div>
      <label className="flex items-start gap-2 text-xs font-bold">
        <input type="checkbox" checked={linked} onChange={(e) => setLinked(e.target.checked)} className="mt-0.5 h-4 w-4" />
        <span>Ikut ubah bentuk lain yang warnanya sama</span>
      </label>
    </div>
  );
}
