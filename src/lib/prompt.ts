import type { PromptSettings, Ratio } from "@/types";

export const THEME_MIN = 3;
export const THEME_MAX = 500;
export const IDEA_MIN = 3;
export const IDEA_MAX = 2000;

const INTRO_TITLE =
  "Kamu adalah Motion Graphics Designer profesional dan JavaScript Canvas API Developer untuk video microstock premium.";
const INTRO = [INTRO_TITLE, "Buat kode JavaScript Canvas lengkap untuk Motion Studio berdasarkan pengaturan berikut:"];
const INTRO_DIRECT = [INTRO_TITLE, "Buat kode JavaScript Canvas lengkap untuk Motion Studio berdasarkan deskripsi berikut:"];

const VISUAL_RULES = [
  "Visual harus premium, modern, profesional, dan komersial.",
  "Visual harus cocok untuk microstock.",
  "Komposisi harus rapi, seimbang, dan tidak menumpuk.",
  "Objek utama harus terlihat jelas.",
  "Hindari objek keluar dari frame.",
  "Hindari teks tertutup objek.",
  "Jangan gunakan logo, brand, watermark, karakter berlisensi, atau asset eksternal.",
];

const MOTION_RULES = [
  "Animasi harus smooth sepanjang durasi.",
  "Buat intro, animasi utama, dan ending yang rapi.",
  "Gunakan easing agar gerakan terlihat halus.",
  "Tambahkan micro movement agar visual tidak diam.",
  "Gunakan transisi antar scene jika jumlah scene lebih dari 1.",
  "Hindari flicker berlebihan.",
  "Hindari gerakan terlalu cepat.",
];

const EXTRA_MOTION = ["Ending harus menyatu dengan awal (fade ke warna latar) agar video bisa di-loop."];

const CODE_RULES_BEFORE_SIGNATURE = [
  "Output hanya kode JavaScript.",
  "Jangan gunakan HTML.",
  "Jangan gunakan CSS.",
  "Jangan gunakan library eksternal.",
  "Jangan gunakan gambar, logo, font eksternal, atau asset eksternal.",
  "Semua elemen visual harus dibuat langsung dengan Canvas API.",
  "Kode wajib menggunakan function berikut:",
];

const SIGNATURE = ["function draw(ctx, time, width, height) {", "// kode animasi di sini", "}"];

const CODE_RULES_AFTER_SIGNATURE = [
  "Parameter time menggunakan detik, bukan milidetik.",
  "Kode harus responsive mengikuti width dan height.",
  "Background harus dibuat dengan Canvas.",
  "Gunakan warna modern dan premium.",
  "Gunakan efek secukupnya, jangan terlalu berat.",
  "Jangan ada error syntax.",
];

const EXTRA_CODE = [
  "Jangan gunakan while(true) atau for(;;). Semua gerakan dihitung dari parameter time.",
  "Bungkus output dalam satu blok ```javascript tanpa penjelasan.",
];

const bullets = (rules: string[]) => rules.map((r) => `· ${r}`);

function rulesSection(): string[] {
  return [
    "ATURAN VISUAL:",
    ...bullets(VISUAL_RULES),
    "",
    "ATURAN MOTION:",
    ...bullets([...MOTION_RULES, ...EXTRA_MOTION]),
    "",
    "ATURAN KODE:",
    ...bullets(CODE_RULES_BEFORE_SIGNATURE),
    ...SIGNATURE,
    ...bullets([...CODE_RULES_AFTER_SIGNATURE, ...EXTRA_CODE]),
  ];
}

export function cleanTheme(theme: string): string {
  return theme.replace(/\s+/g, " ").replace(/[[\]]/g, "").trim().slice(0, THEME_MAX);
}

export function isThemeValid(theme: string): boolean {
  return cleanTheme(theme).length >= THEME_MIN;
}

export function cleanIdea(idea: string): string {
  return idea
    .replace(/\r\n?/g, "\n")
    .replace(/[[\]]/g, "")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, IDEA_MAX);
}

export function isIdeaValid(idea: string): boolean {
  return cleanIdea(idea).length >= IDEA_MIN;
}

export interface PromptInput extends PromptSettings {
  duration: number;
  ratio: Ratio;
}

export function buildPrompt(p: PromptInput): string {
  return [
    ...INTRO,
    "",
    "TEMA VIDEO:",
    `[${cleanTheme(p.theme)}]`,
    "DURASI:",
    `[${p.duration} detik]`,
    "JUMLAH SCENE:",
    `[${p.scenes} scene]`,
    "RASIO:",
    `[${p.ratio}]`,
    "GAYA VISUAL:",
    `[${p.style}]`,
    "KONSEP VISUAL:",
    `[${p.concept}]`,
    "",
    ...rulesSection(),
  ].join("\n");
}

export interface DirectInput {
  idea: string;
  duration: number;
  ratio: Ratio;
}

export function buildDirectPrompt(p: DirectInput): string {
  return [
    ...INTRO_DIRECT,
    "",
    "DESKRIPSI VIDEO:",
    `[${cleanIdea(p.idea)}]`,
    "DURASI:",
    `[${p.duration} detik]`,
    "RASIO:",
    `[${p.ratio}]`,
    "",
    ...rulesSection(),
  ].join("\n");
}