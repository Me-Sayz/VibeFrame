"use client";

import { useCallback } from "react";
import { RATIO_KEYS, type Ratio } from "@/types";
import { usePersistentState } from "./usePersistentState";

export const HISTORY_MAX = 20;

export interface HistoryEntry {
  id: string;
  name: string;
  code: string;
  ratio: Ratio;
  duration: number;
  at: number;
  layers: string[];
}

export type NewHistoryEntry = Pick<HistoryEntry, "code" | "ratio" | "duration" | "layers">;

const isEntry = (v: unknown): v is HistoryEntry => {
  if (typeof v !== "object" || v === null) return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    typeof e.name === "string" &&
    typeof e.code === "string" &&
    typeof e.ratio === "string" &&
    (RATIO_KEYS as readonly string[]).includes(e.ratio) &&
    typeof e.duration === "number" &&
    typeof e.at === "number" &&
    Array.isArray(e.layers) &&
    e.layers.every((n) => typeof n === "string")
  );
};

const isHistory = (v: unknown) => Array.isArray(v) && v.every(isEntry);

const autoName = (at: number) =>
  new Date(at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function useHistory() {
  const [items, setItems] = usePersistentState<HistoryEntry[]>("history", [], isHistory);

  const add = useCallback(
    (entry: NewHistoryEntry) => {
      const at = Date.now();
      setItems((prev) => {
        const same = prev.find((p) => p.code === entry.code);
        const next: HistoryEntry = same
          ? { ...same, ...entry, at }
          : { ...entry, id: `${at}-${Math.random().toString(36).slice(2, 8)}`, name: autoName(at), at };
        return [next, ...prev.filter((p) => p !== same)].slice(0, HISTORY_MAX);
      });
    },
    [setItems]
  );

  const rename = useCallback(
    (id: string, raw: string) => {
      const name = raw.trim().slice(0, 60);
      if (!name) return;
      setItems((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
    },
    [setItems]
  );

  const remove = useCallback((id: string) => setItems((prev) => prev.filter((p) => p.id !== id)), [setItems]);
  const clear = useCallback(() => setItems([]), [setItems]);

  return { items, add, rename, remove, clear };
}