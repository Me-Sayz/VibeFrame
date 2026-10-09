"use client";

import { useEffect, useState } from "react";

function read<T>(key: string, initial: T, isValid?: (value: unknown) => boolean): T {
  if (typeof window === "undefined") return initial;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return initial;
    const parsed: unknown = JSON.parse(raw);
    return !isValid || isValid(parsed) ? (parsed as T) : initial;
  } catch {
    return initial;
  }
}

export function usePersistentState<T>(key: string, initial: T, isValid?: (value: unknown) => boolean) {
  const [value, setValue] = useState<T>(() => read(key, initial, isValid));

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);

  return [value, setValue] as const;
}