"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { findTemplate } from "@/data/templates";
import { usePersistentState } from "@/hooks/usePersistentState";
import { LicenseError, refineIdea, requestMagic } from "@/lib/ai";
import type { IdeaHints } from "@/lib/ideas";
import { MAGIC_MIN } from "@/lib/magic";
import { IDEA_MAX, REFINE_MAX, buildDirectPrompt, capReferences, isIdeaValid, type PromptLayer } from "@/lib/prompt";
import { isAbort } from "@/lib/render";
import { CONCEPTS, RATIO_KEYS, STYLES, type Concept, type Ratio, type Style } from "@/types";
import BrandToggle from "./BrandToggle";
import IdeasFlow from "./IdeasFlow";
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
  onNeedLicense?: (message: string) => void;
}

interface Snapshot {
  style: Style | "";
  concept: Concept | "";
  duration: number;
  ratio: Ratio;
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
  onNeedLicense,
}: Props) {
  const [idea, setIdea] = usePersistentState("prompt:idea", "", isString);
  const [loop, setLoop] = usePersistentState("prompt:loop", true, isBool);
  const [brand, setBrand] = usePersistentState("prompt:brand", false, isBool);
  const [useTemplate, setUseTemplate] = usePersistentState("prompt:usetemplate", false, isBool);
  const [style, setStyle] = usePersistentState<Style | "">("prompt:dstyle", "", oneOfOrEmpty(STYLES));
  const [concept, setConcept] = usePersistentState<Concept | "">("prompt:dconcept", "", oneOfOrEmpty(CONCEPTS));
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [ideasOpen, setIdeasOpen] = useState(false);
  const [refining, setRefining] = useState(false);
  const [previous, setPrevious] = useState<string | null>(null);
  const [refineNote, setRefineNote] = useState<{ ok: boolean; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refineAbort = useRef<AbortController | null>(null);
  const [magicking, setMagicking] = useState(false);
  const [magicPrev, setMagicPrev] = useState<Snapshot | null>(null);
  const [magicNote, setMagicNote] = useState<{ ok: boolean; text: string } | null>(null);
  const magicAbort = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      refineAbort.current?.abort();
      magicAbort.current?.abort();
    },
    []
  );

  const valid = isIdeaValid(idea);
  const template = useTemplate ? findTemplate(style, concept) : undefined;
  const prompt = useMemo(
    () => (valid ? buildDirectPrompt({ idea, duration, ratio, layers, loop, brand, style, concept, template }) : ""),
    [valid, idea, duration, ratio, layers, loop, brand, style, concept, template]
  );
  const aiLayers = useMemo(() => capReferences(layers ?? []), [layers]);
  const capped = aiLayers.length < (layers?.length ?? 0);
  const generatePrompt = useMemo(
    () =>
      valid && capped
        ? buildDirectPrompt({ idea, duration, ratio, layers: aiLayers, loop, brand, style, concept, template })
        : prompt,
    [valid, capped, prompt, idea, duration, ratio, aiLayers, loop, brand, style, concept, template]
  );

  const trimmedLength = idea.trim().length;
  const tooLong = trimmedLength > REFINE_MAX;
  const canRefine = trimmedLength >= 3 && !tooLong && !refining && !magicking;
  const canMagic = trimmedLength >= MAGIC_MIN && !magicking && !refining && !busy;

  const forgetMagic = () => {
    setMagicPrev(null);
    setMagicNote(null);
  };

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

  const magic = async () => {
    if (!canMagic) return;
    if (locked) {
      onNeedLicense?.("Atur otomatis (AI) butuh lisensi. Masukkan kode lisensi di bawah.");
      return;
    }
    const controller = new AbortController();
    magicAbort.current = controller;
    setMagicking(true);
    setMagicNote(null);
    try {
      const out = await requestMagic(idea.trim(), controller.signal, licenseCode);
      setMagicPrev({ style, concept, duration, ratio });
      setStyle(out.style);
      setConcept(out.concept);
      onDuration(out.duration);
      onRatio(out.ratio);
      setMagicNote({ ok: true, text: out.reason });
    } catch (e) {
      if (e instanceof LicenseError) onNeedLicense?.(e.message);
      else if (!isAbort(e)) setMagicNote({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      magicAbort.current = null;
      setMagicking(false);
    }
  };

  const undoMagic = () => {
    if (magicPrev === null) return;
    setStyle(magicPrev.style);
    setConcept(magicPrev.concept);
    onDuration(magicPrev.duration);
    onRatio(magicPrev.ratio);
    forgetMagic();
  };

  const useIdea = (text: string, hints: IdeaHints | null) => {
    setIdea(text.slice(0, IDEA_MAX));
    setPrevious(null);
    setRefineNote(null);
    forgetMagic();
    if (hints?.style && (STYLES as readonly string[]).includes(hints.style)) setStyle(hints.style as Style);
    if (hints?.concept && (CONCEPTS as readonly string[]).includes(hints.concept)) setConcept(hints.concept as Concept);
    setIdeasOpen(false);
  };

  if (ideasOpen) {
    return (
      <IdeasFlow
        kind="video"
        initialTopic={idea}
        locked={!!locked}
        licenseCode={licenseCode}
        onNeedLicense={(m) => onNeedLicense?.(m)}
        onUse={useIdea}
        onBack={() => setIdeasOpen(false)}
      />
    );
  }

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
          readOnly={refining || magicking}
          onChange={(e) => {
            setIdea(e.target.value);
            setPrevious(null);
            setRefineNote(null);
            forgetMagic();
          }}
          placeholder="Contoh: Drone putih terbang pelan di atas awan, baling-baling berputar, latar belakang hijau polos. Gaya flat vector dengan warna lembut."
          className={`${field} resize-y`}
          aria-label="Deskripsi video"
        />
      </label>
      <button onClick={() => setIdeasOpen(true)} disabled={refining || magicking || busy} className={btn.smallSun}>
        💡 Belum ada ide? Cari ide
      </button>
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

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {magicking ? (
            <button onClick={() => magicAbort.current?.abort()} className={btn.small}>
              ✕ Batal
            </button>
          ) : (
            <button onClick={() => void magic()} disabled={!canMagic} className={btn.smallSun}>
              {locked ? "🔒 Atur otomatis (butuh lisensi)" : "✨ Atur otomatis"}
            </button>
          )}
          {magicPrev !== null && !magicking && (
            <button onClick={undoMagic} className={btn.small}>
              ↩ Urungkan
            </button>
          )}
          {magicking && (
            <span role="status" className="text-xs font-bold">
              ⏳ AI memilihkan pengaturan…
            </span>
          )}
        </div>
        <p className="text-xs opacity-70">
          AI memilihkan gaya, konsep, durasi, dan rasio yang cocok untuk ideamu (minimal {MAGIC_MIN} karakter). Hasilnya mengisi pilihan di bawah dan masih bisa kamu ubah.
        </p>
        {magicNote && (
          <p
            role={magicNote.ok ? "status" : "alert"}
            className={`rounded-lg border-[3px] border-ink p-2 text-xs font-bold text-black ${magicNote.ok ? "bg-lime" : "bg-pink"}`}
          >
            {magicNote.text}
          </p>
        )}
      </div>

      <VisualPickers
        style={style}
        concept={concept}
        onStyle={(v) => {
          setStyle(v);
          forgetMagic();
        }}
        onConcept={(v) => {
          setConcept(v);
          forgetMagic();
        }}
        allowAuto
        useTemplate={useTemplate}
        onUseTemplate={setUseTemplate}
      />

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
            onChange={(e) => {
              onDuration(Number(e.target.value));
              forgetMagic();
            }}
            aria-label="Durasi prompt"
            className="w-full"
          />
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase">Rasio</span>
          <select
            className={field}
            value={ratio}
            onChange={(e) => {
              onRatio(e.target.value as Ratio);
              forgetMagic();
            }}
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
        <button onClick={() => onGenerate(generatePrompt)} disabled={!valid || busy || magicking} className={btn.secondary}>
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
