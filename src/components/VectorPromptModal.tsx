"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";
import { MAX_AI_REFS } from "@/lib/prompt";
import {
  VECTOR_COLORS_MAX,
  VECTOR_COLORS_MIN,
  VECTOR_DETAILS,
  VECTOR_FORMATS,
  VECTOR_IDEA_MAX,
  VECTOR_IDEA_MIN,
  VECTOR_PALETTES,
  VECTOR_STYLES,
  buildVectorPrompt,
  isVectorIdeaValid,
  type VectorDetail,
  type VectorFormat,
  type VectorPalette,
  type VectorStyle,
} from "@/lib/svgPrompt";
import type { AssetLayer } from "@/types/assets";
import Modal from "./Modal";
import { btn, field, mono } from "./ui";

interface Props {
  refs: AssetLayer[];
  generating: boolean;
  locked: boolean;
  onGenerate: (prompt: string) => void;
  onClose: () => void;
}

type CopyState = "idle" | "copied" | "failed";

const isString = (v: unknown) => typeof v === "string";
const isBool = (v: unknown) => typeof v === "boolean";
const oneOf = (list: readonly unknown[]) => (v: unknown) => list.includes(v);
const isColors = (v: unknown) => typeof v === "number" && v >= VECTOR_COLORS_MIN && v <= VECTOR_COLORS_MAX;

export default function VectorPromptModal({ refs, generating, locked, onGenerate, onClose }: Props) {
  const [idea, setIdea] = usePersistentState("vector:idea", "", isString);
  const [style, setStyle] = usePersistentState<VectorStyle>("vector:style", "flat", oneOf(VECTOR_STYLES.map((s) => s.id)));
  const [format, setFormat] = usePersistentState<VectorFormat>("vector:format", "square", oneOf(VECTOR_FORMATS.map((f) => f.id)));
  const [detail, setDetail] = usePersistentState<VectorDetail>("vector:detail", "medium", oneOf(VECTOR_DETAILS.map((d) => d.id)));
  const [palette, setPalette] = usePersistentState<VectorPalette>("vector:palette", "auto", oneOf(VECTOR_PALETTES.map((p) => p.id)));
  const [colors, setColors] = usePersistentState("vector:colors", 6, isColors);
  const [transparent, setTransparent] = usePersistentState("vector:transparent", true, isBool);
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const valid = isVectorIdeaValid(idea);
  const prompt = useMemo(
    () =>
      valid
        ? buildVectorPrompt({
            idea,
            style,
            format,
            colors,
            transparent,
            detail,
            palette,
            references: refs.map((r) => ({ name: r.name, note: r.note, width: r.width, height: r.height })),
          })
        : "",
    [valid, idea, style, format, colors, transparent, detail, palette, refs]
  );

  const styleInfo = VECTOR_STYLES.find((s) => s.id === style) ?? VECTOR_STYLES[0];
  const detailInfo = VECTOR_DETAILS.find((d) => d.id === detail) ?? VECTOR_DETAILS[1];

  const copy = async () => {
    let next: CopyState = "copied";
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      next = "failed";
    }
    setCopyState(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopyState("idle"), 2500);
  };

  return (
    <Modal title="Prompt AI · Vector" onClose={onClose} widthClass="max-w-3xl">
      <div className="space-y-4">
        {refs.length > 0 && (
          <p className="rounded-lg border-[3px] border-ink bg-lime p-2 text-xs font-bold text-black">
            {refs.length} gambar referensi ikut: Buat Vector (AI) ikut melihatnya (maks {MAX_AI_REFS}). Gambar diperkecil lalu
            dikirim lewat server ke Google Gemini. Untuk Salin prompt, lampirkan sendiri di chat AI.
          </p>
        )}

        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase">Deskripsi gambar</span>
          <textarea
            rows={3}
            maxLength={VECTOR_IDEA_MAX}
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Contoh: piring merah dengan lingkaran hitam di tengahnya, dilihat dari atas"
            className={`${field} resize-none`}
          />
          <span className="mt-1 block text-xs opacity-70">
            Sebut objek, warna, dan suasananya. Minimal {VECTOR_IDEA_MIN} karakter.
          </span>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase">Gaya</span>
            <select className={field} value={style} onChange={(e) => setStyle(e.target.value as VectorStyle)}>
              {VECTOR_STYLES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs opacity-70">{styleInfo.hint}</span>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase">Tingkat detail</span>
            <select className={field} value={detail} onChange={(e) => setDetail(e.target.value as VectorDetail)}>
              {VECTOR_DETAILS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs opacity-70">{detailInfo.hint}</span>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase">Palet warna</span>
            <select className={field} value={palette} onChange={(e) => setPalette(e.target.value as VectorPalette)}>
              {VECTOR_PALETTES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase">Ukuran</span>
            <select className={field} value={format} onChange={(e) => setFormat(e.target.value as VectorFormat)}>
              {VECTOR_FORMATS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
          <div>
            <div className="mb-1 flex justify-between text-xs font-bold uppercase">
              <span>Jumlah warna utama</span>
              <span>{colors}</span>
            </div>
            <input
              type="range"
              min={VECTOR_COLORS_MIN}
              max={VECTOR_COLORS_MAX}
              value={colors}
              onChange={(e) => setColors(Number(e.target.value))}
              aria-label="Jumlah warna utama"
              className="w-full"
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} className="h-4 w-4" />
            Latar transparan
          </label>
        </div>
        <p className="text-xs opacity-70">Warna dan bagian lebih sedikit = lebih mudah diubah warnanya per bagian.</p>

        <textarea
          readOnly
          rows={8}
          value={prompt}
          placeholder={`Prompt muncul setelah deskripsi diisi (minimal ${VECTOR_IDEA_MIN} karakter).`}
          className={mono}
          aria-label="Prompt hasil"
        />

        <button onClick={() => void copy()} disabled={!valid} className={btn.primary}>
          {copyState === "copied" ? "✓ Tersalin" : "📋 Salin prompt"}
        </button>
        <button onClick={() => onGenerate(prompt)} disabled={!valid || generating} className={btn.secondary}>
          {generating ? "⏳ AI sedang menggambar…" : locked ? "🔒 Buat Vector (butuh lisensi)" : "✨ Buat Vector (AI)"}
        </button>

        {copyState === "failed" && (
          <p role="status" className="text-xs font-bold">
            Browser menolak menyalin otomatis. Salin manual dari kotak di atas.
          </p>
        )}

        <p className="text-xs opacity-70">
          Tempel prompt di AI lain (ChatGPT, Claude, atau Gemini), lalu tempel kode SVG-nya di Terminal.
        </p>
      </div>
    </Modal>
  );
}
