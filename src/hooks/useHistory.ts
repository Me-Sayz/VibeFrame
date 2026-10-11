"use client";

import { useCallback } from "react";
import { RATIO_KEYS, type Ratio } from "@/types";
import { usePersistentState } from "./usePersistentState";

export const HISTORY_MAX = 30;

export interface HistoryEntry {
  id: string;
  name: string;
  code: string;
  ratio: Ratio;
  duration: number;
  at: number;
  layers: string[];
  parentId?: string;
  rev?: number;
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
    e.layers.every((n) => typeof n === "string") &&
    (e.parentId === undefined || typeof e.parentId === "string") &&
    (e.rev === undefined || typeof e.rev === "number")
  );
};

const isHistory = (v: unknown) => Array.isArray(v) && v.every(isEntry);

const autoName = (at: number) =>
  new Date(at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function useHistory() {
  const [items, setItems] = usePersistentState<HistoryEntry[]>("history", [], isHistory);

  const add = useCallback(
    (entry: NewHistoryEntry, parent?: NewHistoryEntry) => {
      const at = Date.now();
      const newId = () => `${at}-${Math.random().toString(36).slice(2, 8)}`;
      setItems((prev) => {
        const same = prev.find((p) => p.code === entry.code);
        if (same) {
          const kept: HistoryEntry = { ...same, ...entry, at };
          return [kept, ...prev.filter((p) => p !== same)].slice(0, HISTORY_MAX);
        }

        let list = prev;
        let base = parent && parent.code !== entry.code ? list.find((p) => p.code === parent.code) : undefined;
        if (parent && parent.code !== entry.code && !base) {
          base = { ...parent, id: newId(), name: autoName(at), at };
          list = [base, ...list];
        }
        if (!base) return [{ ...entry, id: newId(), name: autoName(at), at }, ...list].slice(0, HISTORY_MAX);

        const root = (base.parentId && list.find((p) => p.id === base!.parentId)) || base;
        const rev = list.reduce((max, p) => (p.parentId === root.id ? Math.max(max, p.rev ?? 0) : max), 0) + 1;
        const child: HistoryEntry = {
          ...entry,
          id: newId(),
          name: `${root.name} (perbaikan ${rev})`,
          at,
          parentId: root.id,
          rev,
        };
        return [child, root, ...list.filter((p) => p !== root)].slice(0, HISTORY_MAX);
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
