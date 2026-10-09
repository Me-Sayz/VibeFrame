const base =
  "border-[3px] border-ink font-bold shadow-brut transition-all select-none " +
  "enabled:active:translate-x-[4px] enabled:active:translate-y-[4px] enabled:active:shadow-none " +
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";

const small = `${base} rounded-lg px-3 py-1.5 text-xs`;

export const btn = {
  primary: `${base} w-full rounded-lg bg-sun px-4 py-3 text-sm text-black enabled:hover:-translate-x-[1px] enabled:hover:-translate-y-[1px] enabled:hover:shadow-brut-lg`,
  secondary: `${base} w-full rounded-lg bg-card px-4 py-3 text-sm text-ink enabled:hover:bg-sky enabled:hover:text-black`,
  medium: `${base} rounded-lg bg-card px-5 py-2.5 text-sm text-ink enabled:hover:bg-lime enabled:hover:text-black`,
  small: `${small} bg-card text-ink enabled:hover:bg-lime enabled:hover:text-black`,
  smallSun: `${small} bg-sun text-black enabled:hover:bg-lime`,
};

export const card = "rounded-xl border-[3px] border-ink bg-card shadow-brut-lg";

export const field =
  "w-full rounded-lg border-[3px] border-ink bg-card px-3 py-2 text-sm text-ink placeholder:opacity-50 " +
  "focus:outline-none focus:shadow-brut-sm disabled:opacity-50";

export const mono = `${field} resize-none font-mono text-xs`;

export const sectionTitle =
  "mb-2 inline-block rounded-md border-[3px] border-ink bg-pink px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-black";