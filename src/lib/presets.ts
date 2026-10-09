import { RATIOS, type Ratio } from "@/types";

export const PRESETS = [
  { id: "720p", label: "HD 720p", short: 720, mbps: 8, refPixels: 1280 * 720 },
  { id: "1080p", label: "FHD 1080p", short: 1080, mbps: 25, refPixels: 1920 * 1080 },
  { id: "1440p", label: "2K QHD", short: 1440, mbps: 45, refPixels: 2560 * 1440 },
  { id: "2160p", label: "4K UHD", short: 2160, mbps: 80, refPixels: 3840 * 2160 },
] as const;

export type PresetId = (typeof PRESETS)[number]["id"];

export const DEFAULT_PRESET: PresetId = "1080p";
export const BIG_FILE_MB = 150;

export const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

export function presetOf(id: PresetId) {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[1];
}

export function outputSize(ratio: Ratio, scale: number) {
  const { w, h } = RATIOS[ratio];
  return { width: even(w * scale), height: even(h * scale) };
}

export function renderParams(ratio: Ratio, id: PresetId) {
  const preset = presetOf(id);
  const { w, h } = RATIOS[ratio];
  const scale = preset.short / Math.min(w, h);
  const { width, height } = outputSize(ratio, scale);
  const bitrate = Math.round((preset.mbps * 1_000_000 * width * height) / preset.refPixels);
  return { scale, width, height, bitrate };
}

export function estimateMB(bitrate: number, duration: number) {
  return (bitrate * duration) / 8 / 1_000_000;
}