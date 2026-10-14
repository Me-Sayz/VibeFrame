"use client";

import { useId } from "react";
import { CONCEPT_INFO, STYLE_INFO } from "@/data/visuals";
import { findTemplate } from "@/data/templates";
import { CONCEPTS, STYLES, type Concept, type Style } from "@/types";
import TemplatePicker from "./TemplatePicker";
import { field } from "./ui";

interface Props {
  style: Style | "";
  concept: Concept | "";
  onStyle: (value: Style | "") => void;
  onConcept: (value: Concept | "") => void;
  allowAuto?: boolean;
  useTemplate: boolean;
  onUseTemplate: (value: boolean) => void;
}

const AUTO_LABEL = "Otomatis (ikuti deskripsi)";
const AUTO_HINT = "AI memilih sendiri yang paling cocok dengan deskripsimu.";

export default function VisualPickers({ style, concept, onStyle, onConcept, allowAuto, useTemplate, onUseTemplate }: Props) {
  const labelBase = useId();

  const match = findTemplate(style, concept);
  const isAuto = allowAuto && style === "" && concept === "";
  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer items-start gap-2 rounded-lg border-[3px] border-ink bg-paper p-2">
        <input
          type="checkbox"
          checked={useTemplate}
          onChange={(e) => onUseTemplate(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0"
          aria-label="Gunakan Template Kombinasi"
        />
        <span className="text-xs">
          <span className="block font-bold">🎨 Gunakan Template Kombinasi</span>
          <span className="opacity-70">
            {useTemplate
              ? "Pilih satu template jadi: gaya dan konsep terisi otomatis."
              : "Racik sendiri gaya dan konsep visualnya."}
          </span>
        </span>
      </label>

      {useTemplate ? (
        <div>
          <span id={`${labelBase}-template`} className="mb-1 block text-xs font-bold uppercase">
            Template visual
          </span>
          <TemplatePicker
            labelId={`${labelBase}-template`}
            style={style}
            concept={concept}
            allowAuto={allowAuto}
            onPick={(s, c) => {
              onStyle(s);
              onConcept(c);
            }}
          />
          <span className="mt-1 block text-xs opacity-70">
            {match ? match.description : isAuto ? AUTO_HINT : "Pilihan ini tidak cocok dengan template mana pun. Pilih template di atas atau matikan Template Kombinasi untuk mengubahnya manual."}
          </span>
          {match && (
            <span className="mt-1 block text-xs opacity-70">Arahan seni template ini ikut dikirim ke AI bersama gaya dan konsepnya.</span>
          )}
          <span className="mt-1 block break-words text-xs font-bold">
            Gaya: {style || "Otomatis"} · Konsep: {concept || "Otomatis"}
          </span>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase">Gaya visual</span>
            <select
              className={field}
              value={style}
              onChange={(e) => onStyle(e.target.value as Style | "")}
              aria-label="Gaya visual"
            >
              {allowAuto && <option value="">{AUTO_LABEL}</option>}
              {STYLES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs opacity-70">{style ? STYLE_INFO[style].hint : AUTO_HINT}</span>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase">Konsep visual</span>
            <select
              className={field}
              value={concept}
              onChange={(e) => onConcept(e.target.value as Concept | "")}
              aria-label="Konsep visual"
            >
              {allowAuto && <option value="">{AUTO_LABEL}</option>}
              {CONCEPTS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs opacity-70">{concept ? CONCEPT_INFO[concept].hint : AUTO_HINT}</span>
          </label>
        </div>
      )}
    </div>
  );
}
