"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadLayer, sanitizeName, uniqueName, withCutout } from "@/lib/assets";
import { LicenseError, requestAnimation, requestFix } from "@/lib/ai";
import { renderCover } from "@/lib/cover";
import { lintCode } from "@/lib/lint";
import { DEFAULT_PRESET, renderParams, type PresetId } from "@/lib/presets";
import { isAbort, renderMp4 } from "@/lib/render";
import { extractCode, usedLayers, validateCode } from "@/lib/validate";
import type { LogEntry, LogLevel, MotionResult, Ratio } from "@/types";
import type { AssetLayer, Cutout } from "@/types/assets";
import { useHistory, type HistoryEntry } from "./useHistory";

const MAX_LOGS = 200;

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export interface GenerateOutcome {
  status: "ok" | "rejected" | "failed" | "license";
  message?: string;
}

export type AiTask = "generate" | "fix";

export interface RenderProgress {
  done: number;
  total: number;
}

export function useStudio() {
  const [ratio, setRatio] = useState<Ratio>("1:1");
  const [duration, setDuration] = useState(10);
  const [fps, setFps] = useState(30);
  const [preset, setPreset] = useState<PresetId>(DEFAULT_PRESET);
  const [coverTime, setCoverTime] = useState<number | null>(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const [code, setCode] = useState("");
  const [result, setResult] = useState<MotionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [dark, setDark] = useState(false);
  const [progress, setProgress] = useState<RenderProgress | null>(null);
  const [layers, setLayers] = useState<AssetLayer[]>([]);
  const layersRef = useRef<AssetLayer[]>([]);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const cutoutToken = useRef(new Map<string, number>());
  const history = useHistory();
  const addHistory = history.add;
  const runCounter = useRef(0);
  const logCounter = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const aiAbortRef = useRef<AbortController | null>(null);
  const [aiTask, setAiTask] = useState<AiTask | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [fixUndo, setFixUndo] = useState<{ before: string; after: string } | null>(null);

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => () => aiAbortRef.current?.abort(), []);

  const log = useCallback((level: LogLevel, text: string) => {
    logCounter.current += 1;
    const entry: LogEntry = { id: logCounter.current, time: Date.now(), level, text };
    setLogs((prev) => [...prev.slice(-(MAX_LOGS - 1)), entry]);
  }, []);

  const fail = useCallback(
    (text: string) => {
      setError(text);
      log("error", text);
    },
    [log]
  );

  const clearLogs = useCallback(() => setLogs([]), []);

  const commitLayers = useCallback((next: AssetLayer[]) => {
    layersRef.current = next;
    setLayers(next);
  }, []);

  const addFiles = useCallback(
    (files: File[]) => {
      const run = async () => {
        for (const file of files) {
          try {
            const layer = await loadLayer(file, layersRef.current.map((l) => l.name));
            commitLayers([...layersRef.current, layer]);
            log("info", `Layer ditambah: ${layer.name} (${layer.width}×${layer.height})`);
          } catch (e) {
            fail(e instanceof Error ? e.message : String(e));
          }
        }
      };
      queueRef.current = queueRef.current.then(run);
    },
    [commitLayers, fail, log]
  );

  const removeLayer = useCallback(
    (id: string) => commitLayers(layersRef.current.filter((l) => l.id !== id)),
    [commitLayers]
  );

  const renameLayer = useCallback(
    (id: string, raw: string) => {
      const others = layersRef.current.filter((l) => l.id !== id).map((l) => l.name);
      const name = uniqueName(sanitizeName(raw), others);
      commitLayers(layersRef.current.map((l) => (l.id === id ? { ...l, name } : l)));
    },
    [commitLayers]
  );

  const setLayerNote = useCallback(
    (id: string, note: string) => commitLayers(layersRef.current.map((l) => (l.id === id ? { ...l, note } : l))),
    [commitLayers]
  );

  const moveLayer = useCallback(
    (id: string, dir: -1 | 1) => {
      const list = [...layersRef.current];
      const i = list.findIndex((l) => l.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      commitLayers(list);
    },
    [commitLayers]
  );

  const setLayerCutout = useCallback(
    async (id: string, cutout: Cutout) => {
      const base = layersRef.current.find((l) => l.id === id);
      if (!base) return;
      const token = (cutoutToken.current.get(id) ?? 0) + 1;
      cutoutToken.current.set(id, token);
      const apply = (c: Cutout, bitmap: ImageBitmap) =>
        commitLayers(layersRef.current.map((l) => (l.id === id ? { ...l, cutout: c, bitmap } : l)));
      try {
        const next = await withCutout(base, cutout);
        if (cutoutToken.current.get(id) === token) apply(next.cutout, next.bitmap);
      } catch (e) {
        if (cutoutToken.current.get(id) !== token) return;
        apply({ ...cutout, on: false }, base.source);
        fail(e instanceof Error ? e.message : String(e));
      }
    },
    [commitLayers, fail]
  );

  const toggleDark = useCallback(() => {
    const next = document.documentElement.dataset.theme !== "dark";
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
    setDark(next);
  }, []);

  const commitRender = useCallback(
    (clean: string, r: Ratio, d: number, parentCode?: string) => {
      setError(null);
      setRuntimeError(null);
      setCode(clean);
      runCounter.current += 1;
      setResult({ code: clean, ratio: r, duration: d, runId: runCounter.current, assets: layers });
      const parent =
        parentCode && parentCode !== clean && lintCode(parentCode, layers.map((l) => l.name)).level === "clean"
          ? { code: parentCode, ratio: r, duration: d, layers: usedLayers(parentCode) }
          : undefined;
      addHistory({ code: clean, ratio: r, duration: d, layers: usedLayers(clean) }, parent);
      log("info", `Render kode: ${r}, ${d} detik, ${layers.length} layer`);
    },
    [layers, addHistory, log]
  );

  const renderCode = useCallback(() => {
    const clean = extractCode(code);
    const problem = validateCode(clean, layers.map((l) => l.name));
    if (problem) {
      fail(problem);
      return;
    }
    commitRender(clean, ratio, duration);
  }, [code, ratio, duration, layers, fail, commitRender]);

  const openHistory = useCallback(
    (entry: HistoryEntry) => {
      setRatio(entry.ratio);
      setDuration(entry.duration);
      setCode(entry.code);
      const problem = validateCode(entry.code, layers.map((l) => l.name));
      if (problem) {
        fail(problem);
        return;
      }
      commitRender(entry.code, entry.ratio, entry.duration);
    },
    [layers, fail, commitRender]
  );

  const exportMp4 = useCallback(async () => {
    if (!result || abortRef.current) return;
    const controller = new AbortController();
    abortRef.current = controller;
    const { scale, bitrate, width, height } = renderParams(result.ratio, preset);
    setError(null);
    setProgress({ done: 0, total: 1 });
    log("info", `Render MP4 mulai: ${width}×${height}, ${fps} fps, ${result.duration} detik, ${(bitrate / 1e6).toFixed(1)} Mbps`);
    try {
      const out = await renderMp4({
        code: result.code,
        ratio: result.ratio,
        duration: result.duration,
        fps,
        scale,
        bitrate,
        assets: result.assets,
        signal: controller.signal,
        onProgress: (done, total) => setProgress({ done, total }),
      });
      saveBlob(out.blob, `motion-${result.ratio.replace(":", "x")}-${out.width}x${out.height}-${Date.now()}.mp4`);
      log("info", `Render MP4 selesai: ${out.width}×${out.height}, ${out.frames} frame, ${(out.blob.size / 1048576).toFixed(1)} MB`);
    } catch (e) {
      if (isAbort(e)) log("info", "Render MP4 dibatalkan");
      else fail(`Render gagal: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      abortRef.current = null;
      setProgress(null);
    }
  }, [result, fps, preset, log, fail]);

  const coverMax = result ? Math.max(0, result.duration - 1 / fps) : 0;
  const coverAt = Math.min(Math.max(coverTime ?? coverMax / 2, 0), coverMax);

  const saveCover = useCallback(async () => {
    if (!result || coverBusy || progress) return;
    const { scale, width, height } = renderParams(result.ratio, preset);
    setCoverBusy(true);
    log("info", `Cover mulai: detik ${coverAt.toFixed(2)}, ${width}×${height}`);
    try {
      const out = await renderCover({ code: result.code, ratio: result.ratio, time: coverAt, scale, assets: result.assets });
      saveBlob(
        out.blob,
        `cover-${result.ratio.replace(":", "x")}-${out.width}x${out.height}-${coverAt.toFixed(2)}s-${Date.now()}.png`
      );
      log("info", `Cover selesai: ${out.width}×${out.height}, ${(out.blob.size / 1048576).toFixed(1)} MB`);
    } catch (e) {
      fail(`Cover gagal: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setCoverBusy(false);
    }
  }, [result, coverBusy, progress, preset, coverAt, log, fail]);

  const cancelRender = useCallback(() => abortRef.current?.abort(), []);

  const generate = useCallback(
    async (prompt: string, license: string): Promise<GenerateOutcome> => {
      if (aiAbortRef.current) return { status: "failed" };
      const controller = new AbortController();
      aiAbortRef.current = controller;
      setAiTask("generate");
      setError(null);
      log("info", `Buat Animasi (AI): ${ratio}, ${duration} detik`);
      try {
        const { text, model } = await requestAnimation(prompt, controller.signal, license);
        if (model) log("info", `Model AI: ${model}`);
        const clean = extractCode(text);
        setCode(clean);
        const problem = validateCode(clean, layers.map((l) => l.name));
        if (problem) {
          fail(`Kode dari AI ditolak: ${problem} Kodenya sudah dimasukkan ke Terminal untuk dicek.`);
          return { status: "rejected" };
        }
        commitRender(clean, ratio, duration);
        return { status: "ok" };
      } catch (e) {
        if (e instanceof LicenseError) {
          log("error", e.message);
          return { status: "license", message: e.message };
        }
        if (isAbort(e)) log("info", "Buat Animasi dibatalkan");
        else fail(e instanceof Error ? e.message : String(e));
        return { status: "failed" };
      } finally {
        aiAbortRef.current = null;
        setAiTask(null);
      }
    },
    [ratio, duration, layers, fail, log, commitRender]
  );

  const cancelGenerate = useCallback(() => aiAbortRef.current?.abort(), []);

  const layerNames = useMemo(() => layers.map((l) => l.name), [layers]);
  const lint = useMemo(() => lintCode(code, layerNames), [code, layerNames]);
  const codeProblem = lint.level === "error" ? lint.message : (runtimeError ?? "");
  const canRender = lint.level === "clean" && progress === null;
  const canUndoFix = fixUndo !== null && extractCode(code) === fixUndo.after;

  const editCode = useCallback((value: string) => {
    setCode(value);
    setRuntimeError(null);
  }, []);

  const fix = useCallback(
    async (instruction: string, license: string): Promise<GenerateOutcome> => {
      if (aiAbortRef.current) return { status: "failed" };
      const before = extractCode(code);
      if (!before) {
        fail("Belum ada kode untuk diperbaiki. Isi dulu di Terminal atau buat dengan AI.");
        return { status: "failed" };
      }
      const controller = new AbortController();
      aiAbortRef.current = controller;
      setAiTask("fix");
      setError(null);
      log("info", `Perbaiki dengan AI: ${instruction.trim() ? "ubah sesuai permintaan" : "perbaiki error"}`);
      try {
        const { text, model } = await requestFix(
          {
            code: before,
            instruction: instruction.trim(),
            error: codeProblem,
            duration,
            ratio,
            layers: layers.map((l) => ({ name: l.name, width: l.width, height: l.height })),
          },
          controller.signal,
          license
        );
        if (model) log("info", `Model AI: ${model}`);
        const clean = extractCode(text);
        const problem = validateCode(clean, layerNames);
        if (problem) {
          fail(`Hasil perbaikan AI ditolak: ${problem} Kode lama tidak diubah.`);
          return { status: "rejected" };
        }
        if (clean === before) {
          fail("AI tidak mengubah apa pun. Coba tulis permintaan yang lebih jelas.");
          return { status: "failed" };
        }
        setFixUndo({ before, after: clean });
        commitRender(clean, ratio, duration, before);
        return { status: "ok" };
      } catch (e) {
        if (e instanceof LicenseError) {
          log("error", e.message);
          return { status: "license", message: e.message };
        }
        if (isAbort(e)) log("info", "Perbaiki dengan AI dibatalkan");
        else fail(e instanceof Error ? e.message : String(e));
        return { status: "failed" };
      } finally {
        aiAbortRef.current = null;
        setAiTask(null);
      }
    },
    [code, codeProblem, duration, ratio, layers, layerNames, fail, log, commitRender]
  );

  const undoFix = useCallback(() => {
    if (!fixUndo || extractCode(code) !== fixUndo.after) return;
    const { before } = fixUndo;
    setFixUndo(null);
    log("info", "Perbaikan AI diurungkan");
    if (lintCode(before, layerNames).level === "clean") commitRender(before, ratio, duration);
    else editCode(before);
  }, [fixUndo, code, layerNames, ratio, duration, commitRender, editCode, log]);

  const pasteFromClipboard = useCallback(async () => {
    try {
      editCode(await navigator.clipboard.readText());
    } catch {
      fail("Browser menolak akses clipboard. Tempel manual dengan Ctrl+V.");
    }
  }, [fail, editCode]);

  const onPlayerError = useCallback(
    (message: string) => {
      setRuntimeError(`Kode gagal dijalankan: ${message.slice(0, 300)}`);
      setError(`Kode gagal dijalankan: ${message.slice(0, 120)}`);
      log("error", `Kode gagal dijalankan: ${message.slice(0, 300)}`);
    },
    [log]
  );

  const dismissError = useCallback(() => setError(null), []);

  return {
    ratio, setRatio, duration, setDuration, fps, setFps, preset, setPreset,
    code, setCode: editCode, result,
    layers, addFiles, removeLayer, renameLayer, setLayerNote, moveLayer, setLayerCutout,
    error, dismissError, onPlayerError,
    logs, clearLogs,
    renderCode, pasteFromClipboard, history, openHistory,
    generating: aiTask === "generate", fixing: aiTask === "fix", aiBusy: aiTask !== null,
    generate, cancelGenerate, fix, undoFix, canUndoFix, codeProblem, canRender,
    progress, rendering: progress !== null, exportMp4, cancelRender,
    coverAt, coverMax, setCoverTime, coverBusy, saveCover,
    dark, toggleDark,
  };
}