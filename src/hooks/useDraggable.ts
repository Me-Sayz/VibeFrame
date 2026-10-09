"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";

export interface Pos {
  x: number;
  y: number;
}

interface Box {
  w: number;
  h: number;
}

const MARGIN = 8;

export function clampPos(pos: Pos, size: Box, view: Box, margin = MARGIN): Pos {
  const maxX = Math.max(margin, view.w - size.w - margin);
  const maxY = Math.max(margin, view.h - size.h - margin);
  return {
    x: Math.min(Math.max(pos.x, margin), maxX),
    y: Math.min(Math.max(pos.y, margin), maxY),
  };
}

function measure(el: HTMLElement) {
  return {
    size: { w: el.offsetWidth, h: el.offsetHeight },
    view: { w: window.innerWidth, h: window.innerHeight },
  };
}

function readSaved(key: string): Pos | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (typeof v?.x === "number" && typeof v?.y === "number" && Number.isFinite(v.x) && Number.isFinite(v.y)) {
      return { x: v.x, y: v.y };
    }
  } catch {}
  return null;
}

export function useDraggable(storageKey: string, enabled = true) {
  const panelRef = useRef<HTMLDivElement>(null);
  const pos = useRef<Pos>({ x: 0, y: 0 });
  const drag = useRef<{ id: number; px: number; py: number; start: Pos } | null>(null);
  const frame = useRef(0);

  const paint = useCallback(() => {
    frame.current = 0;
    const el = panelRef.current;
    if (el) el.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
  }, []);

  const schedule = useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame(paint);
  }, [paint]);

  useLayoutEffect(() => {
    const el = panelRef.current;
    drag.current = null;
    if (!el) return;
    if (!enabled) {
      el.style.transform = "";
      return;
    }

    const first = measure(el);
    pos.current = clampPos(
      readSaved(storageKey) ?? { x: first.view.w - first.size.w - 24, y: 88 },
      first.size,
      first.view
    );
    paint();

    const reclamp = () => {
      const m = measure(el);
      pos.current = clampPos(pos.current, m.size, m.view);
      schedule();
    };
    window.addEventListener("resize", reclamp);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(reclamp) : null;
    observer?.observe(el);

    return () => {
      window.removeEventListener("resize", reclamp);
      observer?.disconnect();
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    };
  }, [enabled, storageKey, paint, schedule]);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (!enabled || (e.pointerType === "mouse" && e.button !== 0)) return;
      if ((e.target as HTMLElement).closest("button, a, input, select, textarea")) return;
      drag.current = { id: e.pointerId, px: e.clientX, py: e.clientY, start: { ...pos.current } };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [enabled]
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const d = drag.current;
      const el = panelRef.current;
      if (!d || d.id !== e.pointerId || !el) return;
      const m = measure(el);
      pos.current = clampPos(
        { x: d.start.x + e.clientX - d.px, y: d.start.y + e.clientY - d.py },
        m.size,
        m.view
      );
      schedule();
    },
    [schedule]
  );

  const onPointerEnd = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      drag.current = null;
      try {
        localStorage.setItem(storageKey, JSON.stringify(pos.current));
      } catch {}
    },
    [storageKey]
  );

  const handleProps = useMemo(
    () => ({
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
      style: { touchAction: "none" as const },
    }),
    [onPointerDown, onPointerMove, onPointerEnd]
  );

  return { panelRef, handleProps };
}