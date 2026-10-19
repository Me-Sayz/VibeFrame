"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { ACCEPT } from "@/lib/assets";
import { MAX_AI_REFS } from "@/lib/prompt";
import { VECTOR_NOTE_MAX } from "@/lib/svgPrompt";
import { MAX_FILE_MB, type AssetLayer } from "@/types/assets";
import { btn, field } from "./ui";

interface Props {
  refs: AssetLayer[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  onNote: (id: string, note: string) => void;
  onUseAi: () => void;
}

const THUMB = 56;
const CHECKER = "conic-gradient(#c8c8c8 25%, #ffffff 0 50%, #c8c8c8 0 75%, #ffffff 0) 0 0 / 12px 12px";

function Thumb({ bitmap }: { bitmap: ImageBitmap }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const k = Math.min(THUMB / bitmap.width, THUMB / bitmap.height);
    const w = bitmap.width * k;
    const h = bitmap.height * k;
    ctx.clearRect(0, 0, THUMB, THUMB);
    ctx.drawImage(bitmap, (THUMB - w) / 2, (THUMB - h) / 2, w, h);
  }, [bitmap]);

  return (
    <canvas
      ref={ref}
      width={THUMB}
      height={THUMB}
      aria-hidden="true"
      style={{ background: CHECKER }}
      className="h-14 w-14 shrink-0 rounded-md border-[3px] border-ink"
    />
  );
}

export default function VectorRefs({ refs, onAdd, onRemove, onNote, onUseAi }: Props) {
  const inputId = useId();
  const [over, setOver] = useState(false);
  const full = refs.length >= MAX_AI_REFS;

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length) onAdd(files);
  };

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onAdd(files);
  };

  return (
    <div className="space-y-3">
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={`block cursor-pointer rounded-lg border-[3px] border-dashed border-ink p-4 text-center text-xs font-bold transition ${
          over ? "bg-lime text-black" : "bg-paper hover:bg-sun hover:text-black"
        }`}
      >
        <span className="block text-sm">🖼️ Tarik gambar ke sini atau klik untuk memilih</span>
        <span className="mt-1 block font-normal opacity-80">
          PNG, JPG, WebP, SVG · maks {MAX_FILE_MB} MB per file · {refs.length}/{MAX_AI_REFS} referensi
        </span>
        {full && (
          <span className="mt-1 block rounded bg-pink px-1 text-black">Batas tercapai. Hapus salah satu untuk menambah.</span>
        )}
        <input id={inputId} type="file" accept={ACCEPT} multiple onChange={onPick} className="sr-only" />
      </label>

      {refs.length === 0 ? (
        <p className="text-xs opacity-70">
          Referensi itu acuan: AI melihat gambarnya lalu menggambar ulang dengan bentuk SVG. Hasilnya mirip, bukan salinan
          persis. Gambar diperkecil di browser, lalu dikirim lewat server ke Google Gemini hanya saat kamu menekan Buat Vector
          (AI).
        </p>
      ) : (
        <>
          <ul className="space-y-2" aria-label="Daftar referensi">
            {refs.map((r) => (
              <li key={r.id} className="space-y-2 rounded-lg border-[3px] border-ink bg-paper p-2">
                <div className="flex items-start gap-2">
                  <Thumb bitmap={r.source} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs font-bold">{r.name}</p>
                    <p className="font-mono text-[10px] opacity-70">
                      {r.width}×{r.height} px
                    </p>
                  </div>
                  <button
                    onClick={() => onRemove(r.id)}
                    aria-label={`Hapus ${r.name}`}
                    className={`${btn.small} !px-2 !py-0.5 hover:!bg-pink`}
                  >
                    ✕
                  </button>
                </div>
                <input
                  value={r.note}
                  maxLength={VECTOR_NOTE_MAX}
                  onChange={(e) => onNote(r.id, e.target.value)}
                  placeholder="Catatan untuk AI (opsional), mis. tiru warnanya"
                  aria-label={`Catatan ${r.name}`}
                  className={`${field} !px-2 !py-1 !text-xs`}
                />
              </li>
            ))}
          </ul>
          <button onClick={onUseAi} className={`${btn.medium} w-full`}>
            ✨ Gunakan AI ({refs.length} referensi)
          </button>
        </>
      )}
    </div>
  );
}
