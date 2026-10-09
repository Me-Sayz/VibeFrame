import type { AssetLayer } from "./assets";

export const RATIOS = {
  "1:1": { w: 1080, h: 1080 },
  "16:9": { w: 1920, h: 1080 },
  "9:16": { w: 1080, h: 1920 },
  "4:3": { w: 1440, h: 1080 },
  "4:5": { w: 1080, h: 1350 },
} as const;

export type Ratio = keyof typeof RATIOS;

export const RATIO_KEYS = Object.keys(RATIOS) as Ratio[];

export interface MotionResult {
  code: string;
  ratio: Ratio;
  duration: number;
  runId: number;
  assets?: AssetLayer[];
}

export const STYLES = ["Vector", "Semi-3D", "Minimal"] as const;
export type Style = (typeof STYLES)[number];

export const CONCEPTS = ["Flat vector", "Gradient modern", "Isometric", "Line art", "Neon glow"] as const;
export type Concept = (typeof CONCEPTS)[number];

export const SCENE_OPTIONS = [1, 2, 3, 4, 5, 6] as const;

export interface PromptSettings {
  theme: string;
  scenes: number;
  style: Style;
  concept: Concept;
}

export type LogLevel = "info" | "error";

export interface LogEntry {
  id: number;
  time: number;
  level: LogLevel;
  text: string;
}