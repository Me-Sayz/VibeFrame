"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { renderCover } from "@/lib/cover";
import { DEFAULT_PRESET, renderParams, type PresetId } from "@/lib/presets";
import { isAbort, renderMp4 } from "@/lib/render";
import { extractCode, validateCode } from "@/lib/validate";
import type { LogEntry, LogLevel, MotionResult, Ratio } from "@/types";

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
    setResult({ code: clean, ratio, duration, runId: runCounter.current });
    log("info", `Render kode: ${ratio}, ${duration} detik`);
  }, [code, ratio, duration, fail, log]);

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
      const out = await renderCover({ code: result.code, ratio: result.ratio, time: coverAt, scale });
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
    error, dismissError, onPlayerError,
    logs, clearLogs,
    renderCode, pasteFromClipboard,
    progress, rendering: progress !== null, exportMp4, cancelRender,
    coverAt, coverMax, setCoverTime, coverBusy, saveCover,
    dark, toggleDark,
  };
}