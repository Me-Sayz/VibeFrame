import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        card: "var(--card)",
        ink: "var(--ink)",
        sun: "#FFD93D",
        pink: "#FF6B9D",
        lime: "#B6F24A",
        sky: "#6EC9FF",
      },
      boxShadow: {
        brut: "4px 4px 0 0 var(--ink)",
        "brut-sm": "2px 2px 0 0 var(--ink)",
        "brut-lg": "7px 7px 0 0 var(--ink)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;