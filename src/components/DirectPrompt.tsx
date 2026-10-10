"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";
import { IDEA_MAX, buildDirectPrompt, isIdeaValid, type PromptLayer } from "@/lib/prompt";
import { RATIO_KEYS, type Ratio } from "@/types";
import { btn, field, mono } from "./ui";

interface Props {
  duration: number;
  ratio: Ratio;
     onDuration: (value: number) => void;
     layers?: PromptLayer[];
  onRatio: (value: Ratio) => void;
  onGenerate?: (prompt: string) => void;
  busy?: boolean;
}

type CopyState = "idle" | "copied" | "failed";

const isString = (v: unknown) => typeof v === "string";

export default function DirectPrompt({ duration, ratio, onDuration, onRatio, layers, onGenerate, busy }: Props) {
  const [idea, setIdea] = usePersistentState("prompt:idea", "", isString);
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const valid = isIdeaValid(idea);
  const prompt = useMemo(
    () => (valid ? buildDirectPrompt({ idea, duration, ratio, layers }) : ""),
    [valid, idea, duration, ratio, layers]
  );

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
          onChange={(e) => setIdea(e.target.value)}
          placeholder="Contoh: Drone putih terbang pelan di atas awan, baling-baling berputar, latar belakang hijau polos. Gaya flat vector dengan warna lembut."
          className={`${field} resize-y`}
          aria-label="Deskripsi video"
        />
      </label>
      <p className="text-xs opacity-70">
        Tulis seperti memberi brief ke desainer: objek, gerakan, warna, dan latar. Aturan visual, motion, dan kode ditambahkan otomatis.
      </p>

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
          {busy ? "⏳ AI sedang membuat…" : "✨ Buat Animasi (AI)"}
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