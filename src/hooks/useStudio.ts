"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadLayer, sanitizeName, uniqueName } from "@/lib/assets";
import { renderCover } from "@/lib/cover";
import { DEFAULT_PRESET, renderParams, type PresetId } from "@/lib/presets";
import { isAbort, renderMp4 } from "@/lib/render";
import { extractCode, validateCode } from "@/lib/validate";
import type { LogEntry, LogLevel, MotionResult, Ratio } from "@/types";
import type { AssetLayer } from "@/types/assets";

const MAX_LOGS = 200;

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

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
  const runCounter = useRef(0);
  const logCounter = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

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

  const toggleDark = useCallback(() => {
    const next = document.documentElement.dataset.theme !== "dark";
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
    setDark(next);
  }, []);

  const renderCode = useCallback(() => {
    const clean = extractCode(code);
    const problem = validateCode(clean);
    if (problem) {
      fail(problem);
      return;
    }
    setError(null);
    setCode(clean);
    runCounter.current += 1;
    setResult({ code: clean, ratio, duration, runId: runCounter.current, assets: layers });
    log("info", `Render kode: ${ratio}, ${duration} detik, ${layers.length} layer`);
  }, [code, ratio, duration, layers, fail, log]);

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

  const pasteFromClipboard = useCallback(async () => {
    try {
      setCode(await navigator.clipboard.readText());
    } catch {
      fail("Browser menolak akses clipboard. Tempel manual dengan Ctrl+V.");
    }
  }, [fail]);

  const onPlayerError = useCallback(
    (message: string) => {
      setError(`Kode gagal dijalankan: ${message.slice(0, 120)}`);
      log("error", `Kode gagal dijalankan: ${message.slice(0, 300)}`);
    },
    [log]
  );

  const dismissError = useCallback(() => setError(null), []);

  return {
    ratio, setRatio, duration, setDuration, fps, setFps, preset, setPreset,
    code, setCode, result,
    layers, addFiles, removeLayer, renameLayer, setLayerNote, moveLayer,
    error, dismissError, onPlayerError,
    logs, clearLogs,
    renderCode, pasteFromClipboard,
    progress, rendering: progress !== null, exportMp4, cancelRender,
    coverAt, coverMax, setCoverTime, coverBusy, saveCover,
    dark, toggleDark,
  };
}