import type { PromptSettings, Ratio } from "@/types";

export const THEME_MIN = 3;
export const THEME_MAX = 500;
export const IDEA_MIN = 3;
export const IDEA_MAX = 2000;
export const NOTE_MAX = 80;

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
const SIGNATURE_ASSETS = ["function draw(ctx, time, width, height, assets) {", "// kode animasi di sini", "}"];

export interface PromptLayer {
  name: string;
  note: string;
  width: number;
  height: number;
}

export function cleanNote(note: string): string {
  return note.replace(/\s+/g, " ").replace(/[[\]]/g, "").trim().slice(0, NOTE_MAX);
}

function orientation(w: number, h: number): string {
  if (w === h) return "persegi";
  return w > h ? "lebar" : "tinggi";
}

function layersSection(layers: PromptLayer[]): string[] {
  const lines = layers.map((l) => {
    const note = cleanNote(l.note);
    return `· assets.${l.name}: ${l.width}×${l.height} px, ${orientation(l.width, l.height)}${note ? ` — ${note}` : ""}`;
  });
  return [
    "LAYER GAMBAR (urutan dari paling belakang ke paling depan):",
    ...lines,
    "Cara memakai layer:",
    "· Setiap layer sudah berupa gambar siap pakai di parameter assets. Gambar dengan ctx.drawImage(assets.nama, x, y, lebar, tinggi).",
    "· Jangan memuat gambar sendiri (tanpa new Image, fetch, atau URL). Pakai hanya layer di atas.",
    "· Pertahankan rasio asli tiap layer saat menggambar, jangan dipanjangkan atau dipipihkan.",
    "· Gerakkan tiap layer secara terpisah (posisi, skala, rotasi, transparansi) sesuai animasi. Semua gerakan dihitung dari parameter time.",
    "· Gunakan semua layer yang disediakan dan gambar sesuai urutan dari belakang ke depan.",
  ];
}

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

function withLayers(rules: string[], swaps: [string, string][]): string[] {
  return rules.map((r) => swaps.find(([from]) => from === r)?.[1] ?? r);
}

function rulesSection(layers: PromptLayer[] = []): string[] {
  const has = layers.length > 0;
  const visual = has
    ? withLayers(VISUAL_RULES, [
        [
          "Jangan gunakan logo, brand, watermark, karakter berlisensi, atau asset eksternal.",
          "Jangan tambahkan logo, brand, watermark, atau karakter berlisensi selain yang ada di layer gambar.",
        ],
      ])
    : VISUAL_RULES;
  const before = has
    ? withLayers(CODE_RULES_BEFORE_SIGNATURE, [
        [
          "Jangan gunakan gambar, logo, font eksternal, atau asset eksternal.",
          "Jangan gunakan font eksternal atau asset dari luar. Gambar hanya boleh berasal dari layer gambar yang disediakan.",
        ],
        [
          "Semua elemen visual harus dibuat langsung dengan Canvas API.",
          "Semua elemen visual selain layer gambar harus dibuat langsung dengan Canvas API.",
        ],
      ])
    : CODE_RULES_BEFORE_SIGNATURE;
  const after = has
    ? withLayers(CODE_RULES_AFTER_SIGNATURE, [
        ["Background harus dibuat dengan Canvas.", "Background dibuat dengan Canvas, kecuali ada layer gambar yang dipakai sebagai background."],
      ])
    : CODE_RULES_AFTER_SIGNATURE;
  return [
    ...(has ? [...layersSection(layers), ""] : []),
    "ATURAN VISUAL:",
    ...bullets(visual),
    "",
    "ATURAN MOTION:",
    ...bullets([...MOTION_RULES, ...EXTRA_MOTION]),
    "",
    "ATURAN KODE:",
    ...bullets(before),
    ...(has ? SIGNATURE_ASSETS : SIGNATURE),
    ...bullets([...after, ...EXTRA_CODE]),
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
  layers?: PromptLayer[];
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
    ...rulesSection(p.layers),
  ].join("\n");
}

export interface DirectInput {
  idea: string;
  duration: number;
  ratio: Ratio;
  layers?: PromptLayer[];
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
    ...rulesSection(p.layers),
  ].join("\n");
}