"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { TEMPLATES, TEMPLATE_CATEGORIES, findTemplate, type VisualTemplate } from "@/data/templates";
import type { Concept, Style } from "@/types";
import { field } from "./ui";

interface Props {
  labelId: string;
  style: Style | "";
  concept: Concept | "";
  allowAuto?: boolean;
  onPick: (style: Style | "", concept: Concept | "") => void;
}

interface Row {
  key: string;
  template?: VisualTemplate;
}

const AUTO_KEY = "__auto";
const AUTO_LABEL = "Otomatis (ikuti deskripsi)";

export default function TemplatePicker({ labelId, style, concept, allowAuto, onPick }: Props) {
  const base = useId();
  const valueId = `${base}-value`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const rows: Row[] = [...(allowAuto ? [{ key: AUTO_KEY }] : []), ...TEMPLATES.map((t) => ({ key: t.id, template: t }))];
  const match = findTemplate(style, concept);
  const isAuto = !!allowAuto && style === "" && concept === "";
  const selectedKey = match ? match.id : isAuto ? AUTO_KEY : "";
  const optionId = (i: number) => `${base}-opt-${i}`;

  const title = match ? match.name : isAuto ? AUTO_LABEL : "Kustom";
  const sub = match ? `${match.style} + ${match.concept}` : isAuto ? "" : `${style || "Otomatis"} + ${concept || "Otomatis"}`;

  const openList = () => {
    const at = rows.findIndex((r) => r.key === selectedKey);
    setActive(at >= 0 ? at : 0);
    setOpen(true);
  };

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  const choose = (i: number) => {
    const row = rows[i];
    if (!row) return;
    if (row.template) onPick(row.template.style, row.template.concept);
    else onPick("", "");
    close(true);
  };

  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.getElementById(optionId(active))?.scrollIntoView?.({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const onListKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = rows.length - 1;
    switch (e.key) {
      case "ArrowDown":
        setActive((a) => Math.min(last, a + 1));
        break;
      case "ArrowUp":
        setActive((a) => Math.max(0, a - 1));
        break;
      case "Home":
        setActive(0);
        break;
      case "End":
        setActive(last);
        break;
      case "Enter":
      case " ":
        choose(active);
        break;
      case "Escape":
        e.stopPropagation();
        close(true);
        break;
      case "Tab":
        close(false);
        return;
      default:
        return;
    }
    e.preventDefault();
  };

  const onTriggerKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Escape" && open) {
      e.stopPropagation();
      close(false);
    } else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !open) {
      e.preventDefault();
      openList();
    }
  };

  const renderRow = (row: Row) => {
    const i = rows.indexOf(row);
    const t = row.template;
    const selected = row.key === selectedKey;
    const tone = selected ? "bg-sun text-black" : i === active ? "bg-lime text-black" : "bg-card text-ink";
    return (
      <div
        key={row.key}
        id={optionId(i)}
        role="option"
        aria-selected={selected}
        onClick={() => choose(i)}
        onMouseEnter={() => setActive(i)}
        className={`cursor-pointer border-t-2 border-ink/20 px-3 py-2 first:border-t-0 ${tone}`}
      >
        <span className="flex items-start justify-between gap-2">
          <span className="min-w-0 break-words text-sm font-bold">
            {t ? t.name : AUTO_LABEL}
            {t?.trending && <span className="ml-2 whitespace-nowrap rounded border-2 border-current px-1 text-[10px] font-bold">🔥 Tren</span>}
          </span>
          {selected && (
            <span aria-hidden className="shrink-0 text-sm font-bold">
              ✓
            </span>
          )}
        </span>
        {t ? (
          <>
            <span className="mt-0.5 block break-words text-xs font-semibold opacity-80">
              {t.style} + {t.concept}
            </span>
            <span className="mt-0.5 line-clamp-2 block break-words text-xs opacity-70">{t.description}</span>
          </>
        ) : (
          <span className="mt-0.5 block text-xs opacity-70">AI memilih gaya dan konsep sendiri sesuai deskripsimu.</span>
        )}
      </div>
    );
  };

  const auto = rows.find((r) => r.key === AUTO_KEY);

  return (
    <div ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        data-template-trigger
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${labelId} ${valueId}`}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={onTriggerKey}
        className={`${field} flex items-center justify-between gap-2 text-left`}
      >
        <span id={valueId} className="min-w-0 flex-1">
          <span className="block break-words font-bold">{title}</span>
          {sub && <span className="block break-words text-xs opacity-70">{sub}</span>}
        </span>
        <span aria-hidden className="shrink-0 text-xs">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          tabIndex={0}
          aria-labelledby={labelId}
          aria-activedescendant={optionId(active)}
          onKeyDown={onListKey}
          className="mt-2 max-h-[50vh] overflow-y-auto overscroll-contain rounded-lg border-[3px] border-ink bg-card shadow-brut-sm focus:outline-none"
        >
          {auto && renderRow(auto)}
          {TEMPLATE_CATEGORIES.map((cat) => (
            <div key={cat.label} role="group" aria-label={cat.label}>
              <div role="presentation" className="sticky top-0 z-10 border-y-2 border-ink bg-pink px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-black">
                {cat.label}
              </div>
              {cat.items.map((t) => renderRow(rows.find((r) => r.key === t.id)!))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
