"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LicenseError, requestVector } from "@/lib/ai";
import { loadLayer } from "@/lib/assets";
import { MAX_AI_REFS } from "@/lib/prompt";
import { encodeReferences } from "@/lib/refEncode";
import { isAbort } from "@/lib/render";
import { rasterize, sanitizeSvg, withBackground } from "@/lib/svg";
import type { LogEntry, LogLevel } from "@/types";
import type { AssetLayer } from "@/types/assets";
import { usePersistentState } from "./usePersistentState";
import type { GenerateOutcome } from "./useStudio";

const MAX_LOGS = 200;
const isString = (v: unknown) => typeof v === "string";

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function useVector() {
  const [svg, setSvg] = usePersistentState("vector:svg", "", isString);
  const [code, setCode] = useState(svg);
  const [refs, setRefs] = useState<AssetLayer[]>([]);
  const refsRef = useRef<AssetLayer[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [dark, setDark] = useState(false);
  const logId = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
    return () => abortRef.current?.abort();
  }, []);

  const log = useCallback((level: LogLevel, text: string) => {
    setLogs((prev) => [...prev, { id: ++logId.current, time: Date.now(), level, text }].slice(-MAX_LOGS));
  }, []);

  const fail = useCallback(
    (message: string) => {
      setError(message);
      log("error", message);
    },
    [log]
  );

  const toggleDark = useCallback(() => {
    const next = document.documentElement.dataset.theme !== "dark";
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
    setDark(next);
  }, []);

  const apply = useCallback(
    (text: string, prefix = ""): boolean => {
      const r = sanitizeSvg(text);
      if (!r.ok) {
        setCode(text);
        fail(r.error);
        return false;
      }
      setSvg(r.svg);
      setCode(r.svg);
      setError(null);
      const parts = [prefix];
      if (r.removed.length > 0) parts.push(`Elemen dibuang demi keamanan: ${r.removed.join(", ")}.`);
      if (r.fixed.length > 0) parts.push(`${r.fixed.join(", ")}.`);
      const message = parts.filter(Boolean).join(" ");
      setNotice(message || null);
      log("info", `SVG ditampilkan${message ? `. ${message}` : ""}`);
      return true;
    },
    [fail, log, setSvg]
  );

  const showCode = useCallback(() => {
    apply(code);
  }, [apply, code]);

  const pasteFromClipboard = useCallback(async () => {
    let text: string;
    try {
      text = await navigator.clipboard.readText();
    } catch {
      fail("Browser menolak akses clipboard. Tempel manual dengan Ctrl+V.");
      return;
    }
    if (sanitizeSvg(text).ok) apply(text);
    else setCode(text);
  }, [apply, fail]);

  const editSvg = useCallback(
    (next: string) => {
      setSvg(next);
      setCode(next);
    },
    [setSvg]
  );

  const clearImage = useCallback(() => {
    setSvg("");
    setCode("");
    setError(null);
    setNotice(null);
    log("info", "Gambar dihapus");
  }, [log, setSvg]);

  const commitRefs = useCallback((next: AssetLayer[]) => {
    refsRef.current = next;
    setRefs(next);
  }, []);

  const addRefs = useCallback(
    async (files: File[]) => {
      setError(null);
      let list = refsRef.current;
      const before = list.length;
      for (const file of files) {
        if (list.length >= MAX_AI_REFS) {
          fail(`Maksimal ${MAX_AI_REFS} gambar referensi. Hapus salah satu dulu.`);
          break;
        }
        try {
          const layer = await loadLayer(file, list.map((l) => l.name));
          list = [...list, { ...layer, mode: "reference" }];
        } catch (e) {
          fail(e instanceof Error ? e.message : String(e));
        }
      }
      commitRefs(list);
      if (list.length > before) log("info", `${list.length - before} gambar referensi ditambahkan`);
    },
    [commitRefs, fail, log]
  );

  const removeRef = useCallback(
    (id: string) => commitRefs(refsRef.current.filter((l) => l.id !== id)),
    [commitRefs]
  );

  const setRefNote = useCallback(
    (id: string, note: string) => commitRefs(refsRef.current.map((l) => (l.id === id ? { ...l, note } : l))),
    [commitRefs]
  );

  const generate = useCallback(
    async (prompt: string, license: string): Promise<GenerateOutcome> => {
      if (abortRef.current) return { status: "failed" };
      const controller = new AbortController();
      abortRef.current = controller;
      setBusy(true);
      setError(null);
      setNotice(null);
      log("info", "Buat Vector (AI)");
      try {
        const sent = refsRef.current.slice(0, MAX_AI_REFS);
        const images = sent.length > 0 ? await encodeReferences(sent) : [];
        if (images.length > 0) log("info", `Mengirim ${images.length} gambar referensi (diperkecil) ke AI`);
        const { text, model } = await requestVector(prompt, controller.signal, license, images);
        if (model) log("info", `Model AI: ${model}`);
        return apply(text, `Selesai (model: ${model || "?"}).`) ? { status: "ok" } : { status: "rejected" };
      } catch (e) {
        if (e instanceof LicenseError) {
          log("error", e.message);
          return { status: "license", message: e.message };
        }
        if (isAbort(e)) log("info", "Buat Vector dibatalkan");
        else fail(e instanceof Error ? e.message : String(e));
        return { status: "failed" };
      } finally {
        abortRef.current = null;
        setBusy(false);
      }
    },
    [apply, fail, log]
  );

  const cancelGenerate = useCallback(() => abortRef.current?.abort(), []);

  const downloadSvg = useCallback(
    (bg: string | null = null) => {
      if (!svg) return;
      const out = bg ? withBackground(svg, bg) : svg;
      saveBlob(new Blob([out], { type: "image/svg+xml" }), `vector-${Date.now()}.svg`);
      log("info", `SVG diunduh${bg ? ` dengan latar ${bg}` : ""}`);
    },
    [svg, log]
  );

  const downloadPng = useCallback(
    async (width: number, bg: string | null = null) => {
      if (!svg) return;
      try {
        const blob = await rasterize(bg ? withBackground(svg, bg) : svg, width);
        saveBlob(blob, `vector-${width}px-${Date.now()}.png`);
        log("info", `PNG ${width}px diunduh${bg ? ` dengan latar ${bg}` : ""} (${(blob.size / 1048576).toFixed(1)} MB)`);
      } catch (e) {
        fail(`PNG gagal: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
    [svg, fail, log]
  );

  const clearLogs = useCallback(() => setLogs([]), []);

  return {
    svg, code, setCode, showCode, pasteFromClipboard, editSvg, clearImage,
    refs, addRefs, removeRef, setRefNote,
    busy, error, notice, logs, clearLogs,
    generate, cancelGenerate, downloadSvg, downloadPng,
    dark, toggleDark,
  };
}
