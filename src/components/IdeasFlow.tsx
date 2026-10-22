"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LicenseError, requestCompose, requestIdeas } from "@/lib/ai";
import {
  IDEA_COUNT,
  IDEA_PICK_MAX,
  IDEA_RESULT_MAX,
  IDEA_TOPIC_MAX,
  IDEA_TOPIC_MIN,
  buildComposePrompt,
  buildIdeasPrompt,
  hintLabels,
  parseIdeas,
  tidyDescription,
  type Idea,
  type IdeaHints,
  type IdeaKind,
} from "@/lib/ideas";
import { isAbort } from "@/lib/render";
import { btn, field } from "./ui";

interface Props {
  kind: IdeaKind;
  initialTopic?: string;
  locked: boolean;
  licenseCode: string;
  onNeedLicense: (message: string) => void;
  onUse: (description: string, hints: IdeaHints | null) => void;
  onBack: () => void;
}

type Route = "auto" | "manual";
type Step = 1 | 2 | 3;

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: "Topik" },
  { n: 2, label: "Pilih ide" },
  { n: 3, label: "Hasil" },
];

const NOUN = { video: "video", vector: "gambar vector" } as const;

export default function IdeasFlow({ kind, initialTopic = "", locked, licenseCode, onNeedLicense, onUse, onBack }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [route, setRoute] = useState<Route>(locked ? "manual" : "auto");
  const [topic, setTopic] = useState(initialTopic.slice(0, IDEA_TOPIC_MAX));
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [open, setOpen] = useState<number[]>([]);
  const [pasted, setPasted] = useState("");
  const [result, setResult] = useState("");
  const [useHints, setUseHints] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      abort.current?.abort();
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const cleanTopic = topic.trim();
  const topicOk = cleanTopic.length >= IDEA_TOPIC_MIN;
  const chosen = useMemo(() => picked.map((i) => ideas[i]).filter(Boolean), [picked, ideas]);
  const hints = chosen[0]?.hints ?? null;
  const hintText = hints ? hintLabels(kind, hints) : "";
  const manualMerge = step === 3 && chosen.length > 1 && route === "manual";

  const copy = async (id: string, text: string) => {
    let ok = true;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      ok = false;
    }
    setCopied(ok ? id : `${id}:failed`);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), 2500);
  };

  const run = async <T,>(task: (signal: AbortSignal) => Promise<T>): Promise<T | undefined> => {
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setError(null);
    try {
      return await task(controller.signal);
    } catch (e) {
      if (e instanceof LicenseError) onNeedLicense(e.message);
      else if (!isAbort(e)) setError(e instanceof Error ? e.message : String(e));
      return undefined;
    } finally {
      abort.current = null;
      setBusy(false);
    }
  };

  const gotIdeas = (list: Idea[]) => {
    setIdeas(list);
    setPicked([]);
    setOpen([]);
    setStep(2);
  };

  const searchAuto = async () => {
    if (!topicOk || busy) return;
    if (locked) {
      onNeedLicense("Cari ide (AI) butuh lisensi. Masukkan kode lisensi di bawah, atau pakai jalur AI lain.");
      return;
    }
    const out = await run((signal) => requestIdeas(kind, cleanTopic, signal, licenseCode));
    if (out) gotIdeas(out.ideas);
  };

  const readPasted = () => {
    const r = parseIdeas(kind, pasted);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setError(null);
    gotIdeas(r.ideas);
  };

  const toggle = (list: number[], i: number, set: (v: number[]) => void, max = Infinity) => {
    if (list.includes(i)) set(list.filter((x) => x !== i));
    else if (list.length < max) set([...list, i].sort((a, b) => a - b));
  };

  const next = async () => {
    if (chosen.length === 0 || busy) return;
    setError(null);
    if (chosen.length === 1) {
      setResult(chosen[0].description);
      setStep(3);
      return;
    }
    if (route === "manual") {
      setResult("");
      setStep(3);
      return;
    }
    if (locked) {
      onNeedLicense("Menggabungkan ide lewat AI butuh lisensi. Masukkan kode lisensi di bawah.");
      return;
    }
    const out = await run((signal) => requestCompose(kind, cleanTopic, chosen, signal, licenseCode));
    if (out) {
      setResult(out.text);
      setStep(3);
    }
  };

  const finalText = tidyDescription(result);
  const canUse = finalText.length >= 10;

  const back = () => {
    abort.current?.abort();
    setError(null);
    if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
    else onBack();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button onClick={back} className={btn.small}>
          ← {step === 1 ? "Kembali ke form" : "Kembali"}
        </button>
        <ol className="flex flex-wrap items-center gap-1 text-xs font-bold" aria-label="Langkah">
          {STEPS.map((s) => (
            <li
              key={s.n}
              aria-current={step === s.n ? "step" : undefined}
              className={`rounded-md border-[3px] border-ink px-2 py-0.5 text-black ${
                step === s.n ? "bg-sun" : step > s.n ? "bg-lime" : "bg-card text-ink opacity-70"
              }`}
            >
              {step > s.n ? "✓" : s.n} {s.label}
            </li>
          ))}
        </ol>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border-[3px] border-ink bg-pink p-2 text-xs font-bold text-black">
          {error}
        </p>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 flex justify-between text-xs font-bold uppercase">
              <span>Topik {NOUN[kind]}</span>
              <span className="font-mono font-normal opacity-70">
                {topic.length}/{IDEA_TOPIC_MAX}
              </span>
            </span>
            <textarea
              rows={3}
              maxLength={IDEA_TOPIC_MAX}
              value={topic}
              readOnly={busy}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Contoh: kopi di pagi hari, suasana hangat"
              className={`${field} resize-none`}
            />
            <span className="mt-1 block text-xs opacity-70">
              Cukup tulis garis besarnya (minimal {IDEA_TOPIC_MIN} karakter). AI akan menawarkan {IDEA_COUNT} arah yang berbeda.
            </span>
          </label>

          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Cara mencari ide">
            {(
              [
                ["auto", "⚡ Otomatis", "Gemini milik aplikasi"],
                ["manual", "📋 AI lain", "ChatGPT, Claude, dll"],
              ] as const
            ).map(([id, title, sub]) => (
              <button
                key={id}
                onClick={() => {
                  setRoute(id);
                  setError(null);
                }}
                aria-pressed={route === id}
                disabled={busy}
                className={`rounded-lg border-[3px] border-ink p-2 text-left text-xs font-bold text-black shadow-brut-sm disabled:opacity-50 ${
                  route === id ? "bg-sun" : "bg-card text-ink"
                }`}
              >
                <span className="block text-sm">{title}</span>
                <span className="font-normal opacity-80">{sub}</span>
              </button>
            ))}
          </div>

          {route === "auto" ? (
            <div className="space-y-2">
              {busy ? (
                <>
                  <p role="status" className="text-xs font-bold">
                    ⏳ AI sedang mencari ide…
                  </p>
                  <button onClick={() => abort.current?.abort()} className={btn.secondary}>
                    ✕ Batal
                  </button>
                </>
              ) : (
                <button onClick={() => void searchAuto()} disabled={!topicOk} className={btn.primary}>
                  {locked ? "🔒 Cari ide (butuh lisensi)" : `💡 Cari ${IDEA_COUNT} ide`}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-bold">1. Salin prompt ini, lalu tempel di AI lain</p>
                <button
                  onClick={() => void copy("ideas", buildIdeasPrompt(kind, cleanTopic))}
                  disabled={!topicOk}
                  className={btn.secondary}
                >
                  {copied === "ideas" ? "✓ Tersalin" : "📋 Salin prompt cari ide"}
                </button>
                {copied === "ideas:failed" && (
                  <p role="status" className="text-xs font-bold">
                    Browser menolak menyalin otomatis. Coba lagi lewat HTTPS atau localhost.
                  </p>
                )}
              </div>
              <label className="block space-y-1">
                <span className="text-xs font-bold">2. Tempel seluruh balasan AI di sini</span>
                <textarea
                  rows={5}
                  value={pasted}
                  onChange={(e) => setPasted(e.target.value)}
                  placeholder='Balasannya berbentuk { "ideas": [ ... ] }'
                  className={`${field} resize-y font-mono text-xs`}
                />
              </label>
              <button onClick={readPasted} disabled={pasted.trim().length < 20} className={btn.primary}>
                Baca balasan →
              </button>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <p className="text-xs opacity-80">
            Pilih 1 ide, atau beberapa (maks {IDEA_PICK_MAX}) untuk digabung jadi satu. Ketuk <b>Detail</b> kalau mau lihat selengkapnya.
          </p>
          <ul className="space-y-2">
            {ideas.map((idea, i) => {
              const on = picked.includes(i);
              const expanded = open.includes(i);
              const full = !on && picked.length >= IDEA_PICK_MAX;
              const labels = hintLabels(kind, idea.hints);
              return (
                <li key={i} className={`rounded-lg border-[3px] border-ink p-3 ${on ? "bg-sun text-black" : "bg-card"}`}>
                  <label className={`flex items-start gap-2 ${full ? "opacity-50" : "cursor-pointer"}`}>
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={full}
                      onChange={() => toggle(picked, i, setPicked, IDEA_PICK_MAX)}
                      className="mt-0.5 h-4 w-4 shrink-0"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold">{idea.title}</span>
                      {idea.summary && <span className="block text-xs">{idea.summary}</span>}
                    </span>
                  </label>
                  <button
                    onClick={() => toggle(open, i, setOpen)}
                    aria-expanded={expanded}
                    className="mt-2 text-xs font-bold underline"
                  >
                    {expanded ? "Sembunyikan detail ▴" : "Detail ▾"}
                  </button>
                  {expanded && (
                    <div className="mt-2 space-y-1 rounded-md border-2 border-ink bg-card p-2 text-xs text-ink">
                      {idea.look && (
                        <p>
                          <b>Tampilan:</b> {idea.look}
                        </p>
                      )}
                      {labels && (
                        <p>
                          <b>Pengaturan saran:</b> {labels}
                        </p>
                      )}
                      <p className="opacity-80">
                        <b>Deskripsi (Inggris):</b> {idea.description}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold">{picked.length} dipilih</span>
            {busy ? (
              <button onClick={() => abort.current?.abort()} className={btn.small}>
                ✕ Batal
              </button>
            ) : (
              <button onClick={() => void next()} disabled={picked.length === 0} className={btn.smallSun}>
                {picked.length > 1 && route === "auto" ? "Gabungkan dengan AI →" : "Lanjut →"}
              </button>
            )}
          </div>
          {busy && (
            <p role="status" className="text-xs font-bold">
              ⏳ AI menggabungkan ide…
            </p>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {chosen.map((c, i) => (
              <span key={i} className="rounded-md border-2 border-ink bg-lime px-2 py-0.5 text-xs font-bold text-black">
                {c.title}
              </span>
            ))}
          </div>

          {manualMerge && (
            <div className="space-y-1 rounded-lg border-[3px] border-ink bg-card p-3">
              <p className="text-xs font-bold">Menggabungkan {chosen.length} ide lewat AI lain:</p>
              <p className="text-xs opacity-80">1. Salin prompt, tempel di AI lain. 2. Tempel hasilnya di kotak bawah.</p>
              <button
                onClick={() => void copy("compose", buildComposePrompt(kind, cleanTopic, chosen))}
                className={btn.small}
              >
                {copied === "compose" ? "✓ Tersalin" : "📋 Salin prompt gabungan"}
              </button>
              {copied === "compose:failed" && (
                <p role="status" className="text-xs font-bold">
                  Browser menolak menyalin otomatis.
                </p>
              )}
            </div>
          )}

          <label className="block">
            <span className="mb-1 flex justify-between text-xs font-bold uppercase">
              <span>{manualMerge ? "Hasil dari AI lain" : "Deskripsi akhir (bisa diedit)"}</span>
              <span className="font-mono font-normal opacity-70">
                {result.length}/{IDEA_RESULT_MAX}
              </span>
            </span>
            <textarea
              rows={7}
              maxLength={IDEA_RESULT_MAX}
              value={result}
              onChange={(e) => setResult(e.target.value)}
              placeholder={manualMerge ? "Tempel hasil gabungan di sini" : ""}
              className={`${field} resize-y`}
            />
          </label>

          {hintText && (
            <label className="flex items-start gap-2 text-xs font-bold">
              <input type="checkbox" checked={useHints} onChange={(e) => setUseHints(e.target.checked)} className="mt-0.5 h-4 w-4" />
              <span>
                Isi juga pengaturan yang disarankan
                <span className="block font-normal opacity-70">{hintText}</span>
              </span>
            </label>
          )}

          <button onClick={() => onUse(finalText, useHints ? hints : null)} disabled={!canUse} className={btn.primary}>
            ✓ Pakai deskripsi ini
          </button>
        </div>
      )}
    </div>
  );
}
