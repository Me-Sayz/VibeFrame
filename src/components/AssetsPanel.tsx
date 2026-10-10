"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { ACCEPT } from "@/lib/assets";
import { NOTE_MAX } from "@/lib/prompt";
import { MAX_FILE_MB, MAX_LAYERS, MAX_TOLERANCE, type AssetLayer, type Cutout } from "@/types/assets";
import { btn, field } from "./ui";

interface Props {
  layers: AssetLayer[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, raw: string) => void;
  onNote: (id: string, note: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onCutout: (id: string, cutout: Cutout) => void;
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

function NameField({ layer, onRename }: { layer: AssetLayer; onRename: (id: string, raw: string) => void }) {
  const [draft, setDraft] = useState(layer.name);

  useEffect(() => setDraft(layer.name), [layer]);

  const commit = () => {
    if (draft !== layer.name) onRename(layer.id, draft);
  };

  return (
    <label className="flex min-w-0 items-center gap-1 text-xs font-bold">
      <span className="shrink-0 font-mono opacity-70">assets.</span>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        aria-label={`Nama layer ${layer.name}`}
        className={`${field} !px-2 !py-1 font-mono !text-xs`}
      />
    </label>
  );
}

function CutoutControls({ layer, onCutout }: { layer: AssetLayer; onCutout: (id: string, cutout: Cutout) => void }) {
  const { on, tolerance } = layer.cutout;
  const [draft, setDraft] = useState(tolerance);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setDraft(tolerance), [tolerance]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const change = (value: number) => {
    setDraft(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onCutout(layer.id, { on: true, tolerance: value }), 200);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => onCutout(layer.id, { on: !on, tolerance })}
        aria-pressed={on}
        aria-label={`Hapus latar ${layer.name}`}
        className={`${on ? btn.smallSun : btn.small} !px-2 !py-1`}
      >
        ✂️ Hapus latar
      </button>
      {on ? (
        <label className="flex min-w-0 flex-1 items-center gap-2 text-[10px] font-bold">
          <span className="shrink-0">Toleransi {draft}</span>
          <input
            type="range"
            min={0}
            max={MAX_TOLERANCE}
            value={draft}
            onChange={(e) => change(Number(e.target.value))}
            aria-label={`Toleransi hapus latar ${layer.name}`}
            className="min-w-0 flex-1"
          />
        </label>
      ) : (
        <span className="text-[10px] opacity-70">Cocok untuk latar polos (mis. putih).</span>
      )}
    </div>
  );
}

export default function AssetsPanel({ layers, onAdd, onRemove, onRename, onNote, onMove, onCutout }: Props) {
  const inputId = useId();
  const [over, setOver] = useState(false);
  const full = layers.length >= MAX_LAYERS;

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
          PNG, JPG, WebP, SVG · maks {MAX_FILE_MB} MB per file · {layers.length}/{MAX_LAYERS} layer
        </span>
        {full && (
          <span className="mt-1 block rounded bg-pink px-1 text-black">
            Batas layer tercapai. Hapus salah satu untuk menambah.
          </span>
        )}
        <input
          id={inputId}
          type="file"
          accept={ACCEPT}
          multiple
          onChange={onPick}
          className="sr-only"
        />
      </label>

      {layers.length === 0 ? (
        <p className="text-xs opacity-70">
          Belum ada layer. Gambar yang kamu unggah dipakai AI lewat nama layernya (misalnya assets.coin), diproses di
          browser tanpa dikirim ke server.
        </p>
      ) : (
        <>
          <p className="text-xs opacity-70">
            Urutan: paling atas = paling belakang, paling bawah = paling depan. Perubahan layer berlaku setelah Render kode
            ditekan lagi.
          </p>
          <ul className="space-y-2" aria-label="Daftar layer">
            {layers.map((l, i) => (
              <li key={l.id} className="space-y-2 rounded-lg border-[3px] border-ink bg-paper p-2">
                <div className="flex items-start gap-2">
                  <Thumb bitmap={l.bitmap} />
                  <div className="min-w-0 flex-1 space-y-1">
                    <NameField layer={l} onRename={onRename} />
                    <p className="font-mono text-[10px] opacity-70">
                      {l.width}×{l.height} px
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      onClick={() => onMove(l.id, -1)}
                      disabled={i === 0}
                      aria-label={`Pindah ${l.name} ke belakang`}
                      className={`${btn.small} !px-2 !py-0.5`}
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => onMove(l.id, 1)}
                      disabled={i === layers.length - 1}
                      aria-label={`Pindah ${l.name} ke depan`}
                      className={`${btn.small} !px-2 !py-0.5`}
                    >
                      ▼
                    </button>
                  </div>
                  <button
                    onClick={() => onRemove(l.id)}
                    aria-label={`Hapus ${l.name}`}
                    className={`${btn.small} !px-2 !py-0.5 hover:!bg-pink`}
                  >
                    ✕
                  </button>
                </div>
                <input
                  value={l.note}
                  maxLength={NOTE_MAX}
                  onChange={(e) => onNote(l.id, e.target.value)}
                  placeholder="Catatan untuk AI (opsional), mis. latar belakang"
                  aria-label={`Catatan ${l.name}`}
                  className={`${field} !px-2 !py-1 !text-xs`}
                />
                <CutoutControls layer={l} onCutout={onCutout} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}