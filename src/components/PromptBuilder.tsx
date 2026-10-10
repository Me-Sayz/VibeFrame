"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { THEME_CATEGORIES, searchThemes } from "@/data/themes";
import { usePersistentState } from "@/hooks/usePersistentState";
import { THEME_MAX, buildPrompt, isThemeValid, type PromptLayer } from "@/lib/prompt";
import { CONCEPTS, RATIO_KEYS, SCENE_OPTIONS, STYLES, type Concept, type Ratio, type Style } from "@/types";
import { btn, field, mono } from "./ui";

interface Props {
  duration: number;
  ratio: Ratio;
     onDuration: (value: number) => void;
     layers?: PromptLayer[];
  onRatio: (value: Ratio) => void;
}

type CopyState = "idle" | "copied" | "failed";

const isString = (v: unknown) => typeof v === "string";
const oneOf = (list: readonly unknown[]) => (v: unknown) => list.includes(v);
const CATEGORY_IDS = THEME_CATEGORIES.map((c) => c.id);

export default function PromptBuilder({ duration, ratio, onDuration, onRatio, layers }: Props) {
  const [theme, setTheme] = usePersistentState("prompt:theme", "", isString);
  const [categoryId, setCategoryId] = usePersistentState("prompt:category", CATEGORY_IDS[0], oneOf(CATEGORY_IDS));
  const [scenes, setScenes] = usePersistentState<number>("prompt:scenes", 1, oneOf(SCENE_OPTIONS));
  const [style, setStyle] = usePersistentState<Style>("prompt:style", "Vector", oneOf(STYLES));
  const [concept, setConcept] = usePersistentState<Concept>("prompt:concept", "Flat vector", oneOf(CONCEPTS));
  const [query, setQuery] = useState("");
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const category = THEME_CATEGORIES.find((c) => c.id === categoryId) ?? THEME_CATEGORIES[0];
  const matches = useMemo(() => searchThemes(query, 6), [query]);
  const valid = isThemeValid(theme);

  const prompt = useMemo(
    () => (valid ? buildPrompt({ theme, scenes, style, concept, duration, ratio, layers }) : ""),
    [valid, theme, scenes, style, concept, duration, ratio, layers]
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
        <span className="mb-1 block text-xs font-bold uppercase">Tema video</span>
        <textarea
          rows={2}
          maxLength={THEME_MAX}
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder="Contoh: drone yang terlihat seperti terbang, latar belakang hijau"
          className={`${field} resize-none`}
        />
      </label>

      <div className="space-y-2 rounded-lg border-[3px] border-ink bg-paper p-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 Cari preset tema..."
          aria-label="Cari preset tema"
          className={field}
        />

        {query.trim() &&
          (matches.length ? (
            <div className="flex flex-wrap gap-2">
              {matches.map((m) => (
                <button
                  key={`${m.categoryId}-${m.theme}`}
                  onClick={() => {
                    setTheme(m.theme);
                    setCategoryId(m.categoryId);
                    setQuery("");
                  }}
                  className={btn.small}
                >
                  {m.theme}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs opacity-70">Tidak ada preset yang cocok.</p>
          ))}

        <div className="grid gap-2 sm:grid-cols-2">
          <select
            className={field}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            aria-label="Kategori tema"
          >
            {THEME_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.label}
              </option>
            ))}
          </select>
          <select
            className={field}
            value={category.themes.includes(theme) ? theme : ""}
            onChange={(e) => e.target.value && setTheme(e.target.value)}
            aria-label="Tema spesifik"
          >
            <option value="">Pilih tema...</option>
            {category.themes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <span className="mb-1 block text-xs font-bold uppercase">Jumlah scene</span>
        <div className="grid grid-cols-6 gap-1.5">
          {SCENE_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => setScenes(n)}
              aria-pressed={scenes === n}
              className={`rounded-lg border-[3px] border-ink py-1.5 text-xs font-bold transition ${
                scenes === n ? "bg-sun text-black shadow-brut-sm" : "bg-card text-ink hover:bg-lime hover:text-black"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase">Gaya visual</span>
          <select className={field} value={style} onChange={(e) => setStyle(e.target.value as Style)}>
            {STYLES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase">Konsep visual</span>
          <select className={field} value={concept} onChange={(e) => setConcept(e.target.value as Concept)}>
            {CONCEPTS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>

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
      <p className="text-xs opacity-70">Durasi dan rasio sama dengan pengaturan render, mengubahnya di sini juga mengubah di sana.</p>

      <textarea
        readOnly
        rows={8}
        value={prompt}
        placeholder="Prompt muncul setelah tema diisi (minimal 3 karakter)."
        className={mono}
        aria-label="Prompt hasil"
      />

      <button onClick={copy} disabled={!valid} className={btn.primary}>
        {copyState === "copied" ? "✓ Tersalin" : "📋 Salin prompt"}
      </button>

      {copyState === "failed" && (
        <p role="status" className="text-xs font-bold">
          Browser menolak menyalin otomatis. Salin manual dari kotak di atas.
        </p>
      )}

      <p className="text-xs opacity-70">
        Tempel prompt di AI lain (ChatGPT, Claude, atau Gemini), lalu tempel balasan kodenya di Terminal.
      </p>
    </div>
  );
}