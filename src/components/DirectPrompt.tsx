"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";
import { refineIdea } from "@/lib/ai";
import { IDEA_MAX, REFINE_MAX, buildDirectPrompt, isIdeaValid, type PromptLayer } from "@/lib/prompt";
import { isAbort } from "@/lib/render";
import { CONCEPTS, RATIO_KEYS, STYLES, type Concept, type Ratio, type Style } from "@/types";
import BrandToggle from "./BrandToggle";
import LoopToggle from "./LoopToggle";
import VisualPickers from "./VisualPickers";
import { btn, field, mono } from "./ui";

interface Props {
  duration: number;
  ratio: Ratio;
  onDuration: (value: number) => void;
  onRatio: (value: Ratio) => void;
  layers?: PromptLayer[];
  onGenerate?: (prompt: string) => void;
  busy?: boolean;
  locked?: boolean;
  licenseCode?: string;
}

type CopyState = "idle" | "copied" | "failed";

const isString = (v: unknown) => typeof v === "string";
const isBool = (v: unknown) => typeof v === "boolean";
const oneOfOrEmpty = (list: readonly unknown[]) => (v: unknown) => v === "" || list.includes(v);

export default function DirectPrompt({
  duration,
  ratio,
  onDuration,
  onRatio,
  layers,
  onGenerate,
  busy,
  locked,
  licenseCode = "",
}: Props) {
  const [idea, setIdea] = usePersistentState("prompt:idea", "", isString);
  const [loop, setLoop] = usePersistentState("prompt:loop", true, isBool);
  const [brand, setBrand] = usePersistentState("prompt:brand", false, isBool);
  const [style, setStyle] = usePersistentState<Style | "">("prompt:dstyle", "", oneOfOrEmpty(STYLES));
  const [concept, setConcept] = usePersistentState<Concept | "">("prompt:dconcept", "", oneOfOrEmpty(CONCEPTS));
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [refining, setRefining] = useState(false);
  const [previous, setPrevious] = useState<string | null>(null);
  const [refineNote, setRefineNote] = useState<{ ok: boolean; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refineAbort = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      refineAbort.current?.abort();
    },
    []
  );

  const valid = isIdeaValid(idea);
  const prompt = useMemo(
    () => (valid ? buildDirectPrompt({ idea, duration, ratio, layers, loop, brand, style, concept }) : ""),
    [valid, idea, duration, ratio, layers, loop, brand, style, concept]
  );

  const trimmedLength = idea.trim().length;
  const tooLong = trimmedLength > REFINE_MAX;
  const canRefine = trimmedLength >= 3 && !tooLong && !refining;

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

  const refine = async () => {
    if (!canRefine) return;
    const controller = new AbortController();
    refineAbort.current = controller;
    setRefining(true);
    setRefineNote(null);
    try {
      const text = await refineIdea(idea.trim(), licenseCode, controller.signal);
      setPrevious(idea);
      setIdea(text);
      setRefineNote({
        ok: true,
        text: "Deskripsi sudah diperbaiki dan diterjemahkan ke bahasa Inggris. Cek hasilnya, atau klik Urungkan untuk kembali.",
      });
    } catch (e) {
      if (!isAbort(e)) setRefineNote({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      refineAbort.current = null;
      setRefining(false);
    }
  };

  const undo = () => {
    if (previous === null) return;
    setIdea(previous);
    setPrevious(null);
    setRefineNote(null);
  };

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1 flex justify-between text-xs font-bold uppercase">
          <span>Deskripsi video</span>
          <span className="font-mono font-normal opacity-70">
            {idea.length}/{IDEA_MAX}
          </span>
        </span>
        <textarea
          rows={7}
          maxLength={IDEA_MAX}
          value={idea}
          readOnly={refining}
          onChange={(e) => {
            setIdea(e.target.value);
            setPrevious(null);
            setRefineNote(null);
          }}
          placeholder="Contoh: Drone putih terbang pelan di atas awan, baling-baling berputar, latar belakang hijau polos. Gaya flat vector dengan warna lembut."
          className={`${field} resize-y`}
          aria-label="Deskripsi video"
        />
      </label>
      <p className="text-xs opacity-70">
        Tulis seperti memberi brief ke desainer: objek, gerakan, warna, dan latar. Aturan visual, motion, dan kode ditambahkan otomatis.
      </p>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {refining ? (
            <button onClick={() => refineAbort.current?.abort()} className={btn.small}>
              ✕ Batal
            </button>
          ) : (
            <button onClick={() => void refine()} disabled={!canRefine} className={btn.smallSun}>
              ✨ Perbaiki dengan AI
            </button>
          )}
          {previous !== null && !refining && (
            <button onClick={undo} className={btn.small}>
              ↩ Urungkan
            </button>
          )}
          {refining && (
            <span role="status" className="text-xs font-bold">
              ⏳ AI memperbaiki deskripsi…
            </span>
          )}
        </div>
        <p className="text-xs opacity-70">
          {tooLong
            ? previous !== null
              ? `Sudah diperbaiki. Fitur ini hanya untuk deskripsi singkat (maksimal ${REFINE_MAX} karakter), klik Urungkan untuk kembali ke tulisan awal.`
              : `Terlalu panjang untuk fitur ini (maksimal ${REFINE_MAX} karakter).`
            : "Gratis untuk semua. AI menjelaskan idemu lebih detail dalam bahasa Inggris, karena AI pembuat animasi lebih paham brief berbahasa Inggris."}
        </p>
        {refineNote && (
          <p
            role={refineNote.ok ? "status" : "alert"}
            className={`rounded-lg border-[3px] border-ink p-2 text-xs font-bold text-black ${refineNote.ok ? "bg-lime" : "bg-pink"}`}
          >
            {refineNote.text}
          </p>
        )}
      </div>

      <VisualPickers style={style} concept={concept} onStyle={setStyle} onConcept={setConcept} allowAuto />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1 flex justify-between text-xs font-bold uppercase">
            <span>Durasi</span>
            <span>{duration} detik</span>
          </div>
          <input
            type="range"
            min={3}
            max={30}
            value={duration}
            onChange={(e) => onDuration(Number(e.target.value))}
            aria-label="Durasi prompt"
            className="w-full"
          />
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase">Rasio</span>
          <select
            className={field}
            value={ratio}
            onChange={(e) => onRatio(e.target.value as Ratio)}
            aria-label="Rasio prompt"
          >
            {RATIO_KEYS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
      </div>

      <LoopToggle value={loop} onChange={setLoop} />
      <BrandToggle value={brand} onChange={setBrand} />

      <textarea
        readOnly
        rows={8}
        value={prompt}
        placeholder="Prompt muncul setelah deskripsi diisi (minimal 3 karakter)."
        className={mono}
        aria-label="Prompt hasil"
      />

      <button onClick={copy} disabled={!valid} className={btn.primary}>
        {copyState === "copied" ? "✓ Tersalin" : "📋 Salin prompt"}
      </button>

      {onGenerate && (
        <button onClick={() => onGenerate(prompt)} disabled={!valid || busy} className={btn.secondary}>
          {busy ? "⏳ AI sedang membuat…" : locked ? "🔒 Buat Animasi (butuh lisensi)" : "✨ Buat Animasi (AI)"}
        </button>
      )}

      {copyState === "failed" && (
        <p role="status" className="text-xs font-bold">
          Browser menolak menyalin otomatis. Salin manual dari kotak di atas.
        </p>
      )}
    </div>
  );
}
