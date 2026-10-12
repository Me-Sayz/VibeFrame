"use client";

import { useEffect, useRef, useState } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";
import { LicenseError, requestMetadata } from "@/lib/ai";
import { DESC_MAX, DESC_MIN, SITES, SITE_IDS, type Site } from "@/lib/metadata";
import { isAbort } from "@/lib/render";
import { btn, field, sectionTitle } from "./ui";

interface Props {
  licenseActive: boolean;
  licenseCode: string;
  onNeedLicense: (message: string) => void;
  request?: typeof requestMetadata;
}

type Copied = "title" | "keywords" | null;

const isString = (v: unknown) => typeof v === "string";
const isBool = (v: unknown) => typeof v === "boolean";
const isSite = (v: unknown) => typeof v === "string" && (SITE_IDS as string[]).includes(v);

function promptText(): string {
  for (const key of ["prompt:idea", "prompt:theme"]) {
    try {
      const raw = localStorage.getItem(key);
      const value: unknown = raw === null ? null : JSON.parse(raw);
      if (typeof value === "string" && value.trim().length >= DESC_MIN) return value.trim().slice(0, DESC_MAX);
    } catch {}
  }
  return "";
}

const splitKeywords = (text: string) =>
  text
    .split(/[,\n]/)
    .map((k) => k.trim())
    .filter(Boolean);

export default function MetadataTool({ licenseActive, licenseCode, onNeedLicense, request = requestMetadata }: Props) {
  const [description, setDescription] = usePersistentState("microstock:desc", promptText(), isString);
  const [site, setSite] = usePersistentState<Site>("microstock:site", "adobe", isSite);
  const [loop, setLoop] = usePersistentState("microstock:loop", true, isBool);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [keywords, setKeywords] = useState("");
  const [made, setMade] = useState<{ site: Site; model: string } | null>(null);
  const [copied, setCopied] = useState<Copied>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const rules = SITES[site];
  const trimmed = description.trim();
  const canRun = trimmed.length >= DESC_MIN && !busy;
  const list = splitKeywords(keywords);
  const shown = made ? SITES[made.site] : rules;

  const run = async () => {
    if (!canRun) return;
    if (!licenseActive) {
      onNeedLicense("Metadata AI butuh lisensi. Masukkan kode lisensi di bawah.");
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setError(null);
    try {
      const out = await request({ description: trimmed, site, loop }, controller.signal, licenseCode);
      setText(out.text);
      setKeywords(out.keywords.join(", "));
      setMade({ site, model: out.model });
    } catch (e) {
      if (e instanceof LicenseError) onNeedLicense(e.message);
      else if (!isAbort(e)) setError(e instanceof Error ? e.message : String(e));
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  };

  const copy = async (what: Exclude<Copied, null>) => {
    const value = what === "title" ? text : list.join(", ");
    let ok = true;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      ok = false;
    }
    setCopied(ok ? what : null);
    if (!ok) setError("Browser menolak menyalin otomatis. Salin manual dari kotak.");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), 2500);
  };

  const textOver = text.length > shown.textMax;
  const kwBad = list.length < shown.keywordMin || list.length > shown.keywordMax;
  const counter = (bad: boolean) => `font-mono text-[11px] ${bad ? "font-bold text-pink" : "opacity-70"}`;

  return (
    <section className="space-y-3" aria-label="Metadata">
      <span className={sectionTitle}>📝 Judul, deskripsi, keyword</span>
      <p className="text-xs opacity-70">
        AI menulis metadata berbahasa Inggris dari deskripsi videomu. AI tidak melihat videonya, jadi tulis deskripsi yang
        jelas. Butuh lisensi.
      </p>

      <div role="group" aria-label="Situs tujuan" className="grid grid-cols-2 gap-1.5">
        {SITE_IDS.map((id) => (
          <button
            key={id}
            onClick={() => setSite(id)}
            disabled={busy}
            aria-pressed={site === id}
            className={`rounded-lg border-[3px] border-ink px-2 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
              site === id ? "bg-sun text-black shadow-brut-sm" : "bg-card text-ink enabled:hover:bg-lime enabled:hover:text-black"
            }`}
          >
            {SITES[id].label}
          </button>
        ))}
      </div>
      <p className="text-xs opacity-70">{rules.note}</p>

      <label className="block">
        <span className="mb-1 flex justify-between text-xs font-bold uppercase">
          <span>Deskripsi video</span>
          <span className="font-mono font-normal opacity-70">
            {description.length}/{DESC_MAX}
          </span>
        </span>
        <textarea
          rows={4}
          maxLength={DESC_MAX}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={busy}
          placeholder="Contoh: A white drone flies slowly over soft clouds, propellers spinning, flat vector style on a plain green background."
          className={`${field} resize-y`}
          aria-label="Deskripsi video untuk metadata"
        />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            const t = promptText();
            if (t) setDescription(t);
            else setError("Belum ada deskripsi di Prompt AI. Tulis dulu di sana, atau ketik di sini.");
          }}
          disabled={busy}
          className={btn.small}
        >
          ↙ Ambil dari Prompt AI
        </button>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs font-bold">
          <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} disabled={busy} aria-label="Video loop" />
          Video ini loop mulus
        </label>
      </div>

      {busy ? (
        <div className="flex items-center justify-between gap-2">
          <span role="status" className="text-xs font-bold">
            ⏳ AI menulis metadata…
          </span>
          <button onClick={() => abortRef.current?.abort()} className={btn.small}>
            ✕ Batal
          </button>
        </div>
      ) : (
        <button onClick={() => void run()} disabled={!canRun} className={btn.secondary}>
          {!licenseActive ? "🔒 Buat metadata (butuh lisensi)" : made ? "↻ Buat ulang metadata" : "✨ Buat metadata"}
        </button>
      )}

      {error && (
        <p role="alert" className="rounded-lg border-[3px] border-ink bg-pink p-2 text-xs font-bold text-black">
          {error}
        </p>
      )}

      {made && (
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 flex justify-between text-xs font-bold uppercase">
              <span>{shown.fieldLabel}</span>
              <span className={counter(textOver)}>
                {text.length}/{shown.textMax}
              </span>
            </span>
            <textarea
              rows={2}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className={`${field} resize-y`}
              aria-label={shown.fieldLabel}
            />
          </label>
          <button onClick={() => void copy("title")} disabled={!text} className={btn.small}>
            {copied === "title" ? "✓ Tersalin" : `📋 Salin ${shown.fieldLabel.toLowerCase()}`}
          </button>

          <label className="block">
            <span className="mb-1 flex justify-between text-xs font-bold uppercase">
              <span>Keyword (pisahkan dengan koma)</span>
              <span className={counter(kwBad)}>
                {list.length} (batas {shown.keywordMin}–{shown.keywordMax})
              </span>
            </span>
            <textarea
              rows={5}
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className={`${field} resize-y`}
              aria-label="Keyword"
            />
          </label>
          <button onClick={() => void copy("keywords")} disabled={list.length === 0} className={btn.small}>
            {copied === "keywords" ? "✓ Tersalin" : "📋 Salin keyword"}
          </button>

          <p className="text-xs opacity-70">
            Periksa dulu sebelum diunggah: hapus keyword yang tidak sesuai videomu, dan pastikan tidak ada merek dagang.
            {made.model ? ` Model: ${made.model}.` : ""}
          </p>
        </div>
      )}
    </section>
  );
}
