"use client";

import { CONCEPT_INFO, STYLE_INFO } from "@/data/visuals";
import { CONCEPTS, STYLES, type Concept, type Style } from "@/types";
import { field } from "./ui";

interface Props {
  style: Style | "";
  concept: Concept | "";
  onStyle: (value: Style | "") => void;
  onConcept: (value: Concept | "") => void;
  allowAuto?: boolean;
}

const AUTO_LABEL = "Otomatis (ikuti deskripsi)";
const AUTO_HINT = "AI memilih sendiri yang paling cocok dengan deskripsimu.";

export default function VisualPickers({ style, concept, onStyle, onConcept, allowAuto }: Props) {
  return (
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
  );
}
