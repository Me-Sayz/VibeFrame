import type { CSSProperties } from "react";

export const PREVIEW_BGS = {
  checker: {
    label: "Transparan",
    color: null,
    style: {
      backgroundImage: "conic-gradient(#d9d9d9 25%, #ffffff 0 50%, #d9d9d9 0 75%, #ffffff 0)",
      backgroundSize: "20px 20px",
    } as CSSProperties,
  },
  white: { label: "Putih", color: "#ffffff", style: { backgroundColor: "#ffffff" } as CSSProperties },
  gray: { label: "Abu", color: "#808080", style: { backgroundColor: "#808080" } as CSSProperties },
  black: { label: "Hitam", color: "#000000", style: { backgroundColor: "#000000" } as CSSProperties },
  green: { label: "Hijau", color: "#00b140", style: { backgroundColor: "#00b140" } as CSSProperties },
} as const;

export type PreviewBg = keyof typeof PREVIEW_BGS;
export const PREVIEW_BG_IDS = Object.keys(PREVIEW_BGS) as PreviewBg[];

export const PNG_WIDTHS = [1024, 2048, 4096];
