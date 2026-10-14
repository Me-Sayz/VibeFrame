import { CONCEPT_INFO, STYLE_INFO } from "@/data/visuals";
import type { Concept, PromptSettings, Ratio, Style } from "@/types";

export const THEME_MIN = 3;
export const THEME_MAX = 500;
export const IDEA_MIN = 3;
export const IDEA_MAX = 2000;
export const REFINE_MAX = 300;
export const NOTE_MAX = 80;

const INTRO_TITLE =
  "Kamu adalah Motion Graphics Designer profesional dan JavaScript Canvas API Developer untuk video microstock premium.";
const INTRO = [INTRO_TITLE, "Buat kode JavaScript Canvas lengkap untuk VibeFrame berdasarkan pengaturan berikut:"];
const INTRO_DIRECT = [INTRO_TITLE, "Buat kode JavaScript Canvas lengkap untuk VibeFrame berdasarkan deskripsi berikut:"];

const NO_BRAND =
  "Jangan tambahkan teks, logo, brand, watermark, atau karakter berlisensi, kecuali teks yang memang diminta di deskripsi.";
const NO_BRAND_LAYERS =
  "Jangan tambahkan teks, logo, brand, watermark, atau karakter berlisensi selain yang ada di layer gambar, kecuali teks yang memang diminta di deskripsi.";

const BRAND_OK =
  "Teks, logo, brand, atau karakter yang disebut di deskripsi boleh digambar dengan Canvas API (bentuk, path, dan teks). Jangan memuat gambar dari luar.";

const VISUAL_RULES = [
  "Komposisi rapi dan seimbang. Objek utama terlihat jelas dan tidak terpotong frame, dengan margin aman sekitar 8% dari tepi.",
  "Gunakan palet harmonis maksimal 4–5 warna utama, dengan kontras jelas antara objek utama dan latar.",
  NO_BRAND,
  "Jika ada teks, pastikan tidak tertutup objek.",
];

const MOTION_RULES = [
  "Gerakan smooth sepanjang durasi, tanpa bagian yang diam. Tambahkan micro movement agar visual terasa hidup.",
  "Tulis fungsi easing sendiri (misalnya easeInOutCubic) dan pakai untuk semua gerakan. Hindari gerakan linear kecuali memang diminta.",
  "Gunakan transisi halus antar scene jika jumlah scene lebih dari 1.",
  "Hindari flicker dan gerakan terlalu cepat.",
];

const LINEAR_RULES = ["Buat intro, animasi utama, dan ending yang rapi (alur linear, tidak perlu bisa di-loop)."];

const loopRules = (duration: number) => [
  "LOOP MULUS: video harus bisa diputar berulang tanpa terlihat sambungan.",
  `Tulis const DURATION = ${duration}; lalu const p = time / DURATION; (p bergerak dari 0 sampai 1).`,
  "Buat semua gerakan periodik: pakai Math.sin dan Math.cos dengan 2 * Math.PI * bilangan bulat * p, atau gerakan yang kembali ke posisi awal. Kondisi di p = 1 harus sama dengan p = 0.",
  "Jangan fade ke warna latar di akhir, dan jangan ada gerakan satu arah yang tidak kembali ke awal.",
  "Jika ada beberapa scene, scene terakhir bertransisi kembali ke scene pertama.",
];

const CODE_EXTERNAL = "Hanya Canvas API murni: tanpa library, gambar, logo, font, atau asset eksternal.";
const CODE_EXTERNAL_LAYERS =
  "Hanya Canvas API murni: tanpa library, font, atau asset dari luar. Gambar hanya boleh berasal dari layer gambar yang disediakan.";

const CODE_RULES_BEFORE_SIGNATURE = [
  "Output hanya kode JavaScript, tanpa HTML dan CSS.",
  CODE_EXTERNAL,
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

const BACKGROUND = "Mulai setiap frame dengan menggambar background penuh dengan Canvas.";
const BACKGROUND_LAYERS =
  "Mulai setiap frame dengan menggambar background penuh (dengan Canvas, atau layer gambar yang dipakai sebagai background).";

const CODE_RULES_AFTER_SIGNATURE = [
  "Parameter time menggunakan detik, bukan milidetik.",
  BACKGROUND,
  "Tentukan const s = Math.min(width, height) / 1000 lalu ukur semua ukuran, ketebalan garis, dan teks dengan s. Hitung posisi dari width dan height supaya pas di semua rasio.",
  "Bungkus setiap transformasi (translate, rotate, scale, globalAlpha) dengan ctx.save() dan ctx.restore().",
  "Jangan pakai Math.random() atau Date.now(). Untuk variasi (partikel, bintang, dan sebagainya) pakai PRNG dengan seed tetap atau hitung dari nomor indeks, supaya setiap frame konsisten.",
  "Tulis fungsi bantu (clamp, lerp, easing, PRNG) sebagai fungsi murni di luar draw(), dan jangan menyimpan state antar frame: draw() bisa dipanggil dengan time berurutan, mundur, atau melompat.",
  "Batasi efek: maksimal sekitar 200 bentuk per frame, hindari ctx.shadowBlur besar dan ctx.filter, supaya render 4K tetap cepat.",
];

const EXTRA_CODE = [
  "Jangan gunakan while(true) atau for(;;).",
  "Bungkus output dalam satu blok ```javascript tanpa penjelasan.",
];

const bullets = (rules: string[]) => rules.map((r) => `· ${r}`);

function swap(rules: string[], from: string, to: string): string[] {
  return rules.map((r) => (r === from ? to : r));
}

interface RuleOptions {
  layers?: PromptLayer[];
  duration: number;
  loop: boolean;
  brand: boolean;
}

function rulesSection({ layers = [], duration, loop, brand }: RuleOptions): string[] {
  const has = layers.length > 0;
  const visual = swap(VISUAL_RULES, NO_BRAND, brand ? BRAND_OK : has ? NO_BRAND_LAYERS : NO_BRAND);
  const before = has ? swap(CODE_RULES_BEFORE_SIGNATURE, CODE_EXTERNAL, CODE_EXTERNAL_LAYERS) : CODE_RULES_BEFORE_SIGNATURE;
  const after = has ? swap(CODE_RULES_AFTER_SIGNATURE, BACKGROUND, BACKGROUND_LAYERS) : CODE_RULES_AFTER_SIGNATURE;
  return [
    ...(has ? [...layersSection(layers), ""] : []),
    "ATURAN VISUAL:",
    ...bullets(visual),
    "",
    "ATURAN MOTION:",
    ...bullets([...MOTION_RULES, ...(loop ? loopRules(duration) : LINEAR_RULES)]),
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
  loop?: boolean;
  brand?: boolean;
  template?: PromptTemplate;
}

export interface PromptTemplate {
  name: string;
  direction: string;
}

function visualNotes(style?: Style | "", concept?: Concept | "", template?: PromptTemplate): string[] {
  const lines: string[] = [];
  if (style) lines.push(`· Gaya ${style}: ${STYLE_INFO[style].ai}`);
  if (concept) lines.push(`· Konsep ${concept}: ${CONCEPT_INFO[concept].ai}`);
  if (template) {
    lines.push(`· Arahan template ${template.name}: ${template.direction} Ikuti arahan ini sebagai dasar, kecuali bertentangan dengan tema atau deskripsi video di atas.`);
  }
  return lines.length > 0 ? ["PENJELASAN VISUAL:", ...lines, ""] : [];
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
    ...visualNotes(p.style, p.concept, p.template),
    ...rulesSection({ layers: p.layers, duration: p.duration, loop: p.loop ?? true, brand: p.brand ?? false }),
  ].join("\n");
}

export interface DirectInput {
  idea: string;
  duration: number;
  ratio: Ratio;
  layers?: PromptLayer[];
  loop?: boolean;
  brand?: boolean;
  style?: Style | "";
  concept?: Concept | "";
  template?: PromptTemplate;
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
    ...(p.style ? ["GAYA VISUAL:", `[${p.style}]`] : []),
    ...(p.concept ? ["KONSEP VISUAL:", `[${p.concept}]`] : []),
    "",
    ...visualNotes(p.style, p.concept, p.template),
    ...rulesSection({ layers: p.layers, duration: p.duration, loop: p.loop ?? true, brand: p.brand ?? false }),
  ].join("\n");
}