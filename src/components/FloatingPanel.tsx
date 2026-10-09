"use client";

import { useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import { useDraggable } from "@/hooks/useDraggable";
import { btn } from "./ui";

const SIZES = { SM: 360, MD: 480, LG: 640, XL: 800 } as const;
type SizeKey = keyof typeof SIZES;
const SIZE_KEYS = Object.keys(SIZES) as SizeKey[];

const DESKTOP_QUERY = "(min-width: 1024px)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const getSnapshot = () => window.matchMedia(DESKTOP_QUERY).matches;
const getServerSnapshot = () => true;

function readSize(key: string): SizeKey {
  if (typeof window === "undefined") return "MD";
  try {
    const v = localStorage.getItem(key);
    if (v && v in SIZES) return v as SizeKey;
  } catch {}
  return "MD";
}

interface Props {
  title: string;
  storageKey: string;
  onClose: () => void;
  children: ReactNode;
}

export default function FloatingPanel({ title, storageKey, onClose, children }: Props) {
  const desktop = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const sizeKey = `${storageKey}:size`;
  const [size, setSize] = useState<SizeKey>(() => readSize(sizeKey));
  const { panelRef, handleProps } = useDraggable(storageKey, desktop);

  const pick = (next: SizeKey) => {
    setSize(next);
    try {
      localStorage.setItem(sizeKey, next);
    } catch {}
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") onClose();
  };

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={title}
      onKeyDown={onKeyDown}
      style={desktop ? { width: SIZES[size] } : undefined}
      className={
        desktop
          ? "fixed left-0 top-0 z-40 max-w-[calc(100vw-16px)] overflow-hidden rounded-xl border-[3px] border-ink bg-card shadow-brut-lg will-change-transform"
          : "fixed inset-x-0 bottom-0 z-40 overflow-hidden rounded-t-xl border-[3px] border-b-0 border-ink bg-card shadow-brut-lg"
      }
    >
      <div
        {...handleProps}
        className={`flex select-none items-center justify-between gap-2 border-b-[3px] border-ink bg-sky px-3 py-2 text-black ${
          desktop ? "cursor-grab active:cursor-grabbing" : ""
        }`}
        style={desktop ? handleProps.style : undefined}
      >
        <span className="truncate text-xs font-bold uppercase">
          {desktop && "⠿ "}
          {title}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          {desktop && (
            <div className="flex gap-1" role="group" aria-label="Ukuran panel">
              {SIZE_KEYS.map((k) => (
                <button
                  key={k}
                  onClick={() => pick(k)}
                  aria-pressed={size === k}
                  className={`rounded border-2 border-black px-1.5 py-0.5 text-[10px] font-bold ${
                    size === k ? "bg-black text-sky" : "bg-white text-black hover:bg-lime"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          )}
          <button onClick={onClose} aria-label="Tutup" className={`${btn.small} !px-2 !py-0.5`}>
            ✕
          </button>
        </div>
      </div>

      <div className="max-h-[min(70vh,calc(100vh-7rem))] overflow-auto p-3">{children}</div>
    </div>
  );
}