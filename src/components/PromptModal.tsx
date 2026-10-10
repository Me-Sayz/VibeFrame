"use client";

import { useId, type KeyboardEvent } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";
import type { PromptLayer } from "@/lib/prompt";
import type { Ratio } from "@/types";
import DirectPrompt from "./DirectPrompt";
import Modal from "./Modal";
import PromptBuilder from "./PromptBuilder";

const TABS = [
  { id: "template", label: "📝 Template", hint: "Pilih tema dan pengaturan, prompt disusun otomatis." },
  { id: "direct", label: "✍️ Langsung", hint: "Tulis deskripsi sendiri, aturan ditambahkan otomatis." },
] as const;

type TabId = (typeof TABS)[number]["id"];
const isTab = (v: unknown) => TABS.some((t) => t.id === v);

interface Props {
  duration: number;
  ratio: Ratio;
  onDuration: (value: number) => void;
  onRatio: (value: Ratio) => void;
  layers?: PromptLayer[];
  onDropLayers?: () => void;
  onClose: () => void;
}

export default function PromptModal({ duration, ratio, onDuration, onRatio, layers = [], onDropLayers, onClose }: Props) {
  const base = useId();
  const [tab, setTab] = usePersistentState<TabId>("prompt:tab", "template", isTab);
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    else return;
    e.preventDefault();
    setTab(TABS[next].id);
    document.getElementById(`${base}-${TABS[next].id}`)?.focus();
  };

  return (
    <Modal title="Prompt AI" onClose={onClose} widthClass="max-w-3xl">
      <div role="tablist" aria-label="Mode prompt" className="mb-2 grid grid-cols-2 gap-2">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            id={`${base}-${t.id}`}
            role="tab"
            aria-selected={active.id === t.id}
            aria-controls={`${base}-panel`}
            tabIndex={active.id === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`rounded-lg border-[3px] border-ink px-3 py-2 text-sm font-bold transition ${
              active.id === t.id ? "bg-sun text-black shadow-brut-sm" : "bg-card text-ink hover:bg-lime hover:text-black"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="mb-4 text-xs opacity-70">{active.hint}</p>
      {layers.length > 0 && (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-lg border-[3px] border-ink bg-lime p-2 text-xs font-bold text-black">
          <p>{layers.length} layer gambar ikut masuk ke prompt.</p>
          {onDropLayers && (
            <button
              onClick={onDropLayers}
              aria-label="Buang layer gambar dari prompt"
              className="rounded border-2 border-black px-1.5 leading-none hover:bg-black hover:text-lime"
            >
              ✕
            </button>
          )}
        </div>
      )}

      <div role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-${active.id}`}>
        {active.id === "template" ? (
          <PromptBuilder duration={duration} ratio={ratio} onDuration={onDuration} onRatio={onRatio} layers={layers} />
        ) : (
          <DirectPrompt duration={duration} ratio={ratio} onDuration={onDuration} onRatio={onRatio} layers={layers} />
        )}
      </div>
    </Modal>
  );
}