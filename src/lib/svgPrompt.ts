export const VECTOR_STYLES = [
  { id: "flat", label: "Flat", hint: "Warna rata tanpa gradasi, bentuk sederhana dan bersih.", ai: "flat vector: warna rata tanpa gradasi, bentuk sederhana dan bersih, tanpa outline kecuali perlu" },
  { id: "line", label: "Garis (outline)", hint: "Gambar dari garis dengan ketebalan seragam, bagian dalam kosong atau diberi warna tipis.", ai: "line art: garis dengan ketebalan seragam (stroke), ujung bulat, bagian dalam kosong atau diberi warna rata yang tipis" },
  { id: "geometric", label: "Geometris", hint: "Dibangun dari lingkaran, persegi, dan segitiga yang rapi.", ai: "geometris: dibangun dari bentuk dasar (lingkaran, persegi, segitiga, busur) yang presisi dan simetris" },
  { id: "semiflat", label: "Semi-flat (ada bayangan)", hint: "Flat dengan lapisan bayangan dan sorotan berupa bentuk warna rata, bukan gradasi.", ai: "semi-flat: flat vector dengan bayangan dan sorotan berupa bentuk warna rata yang lebih gelap atau terang, tanpa gradasi" },
] as const;

export type VectorStyle = (typeof VECTOR_STYLES)[number]["id"];

export const VECTOR_FORMATS = [
  { id: "square", label: "Persegi 1:1", width: 1000, height: 1000 },
  { id: "wide", label: "Lebar 16:9", width: 1600, height: 900 },
  { id: "tall", label: "Tinggi 9:16", width: 900, height: 1600 },
] as const;

export type VectorFormat = (typeof VECTOR_FORMATS)[number]["id"];

export const VECTOR_IDEA_MIN = 10;
export const VECTOR_IDEA_MAX = 2000;
export const VECTOR_NOTE_MAX = 80;
export const VECTOR_COLORS_MIN = 3;
export const VECTOR_COLORS_MAX = 12;

export interface VectorReference {
  name: string;
  note: string;
  width: number;
  height: number;
}

export interface VectorInput {
  idea: string;
  style: VectorStyle;
  format: VectorFormat;
  colors: number;
  transparent: boolean;
  references?: VectorReference[];
  withReference?: boolean;
}

export const isVectorIdeaValid = (idea: string) => {
  const n = idea.trim().length;
  return n >= VECTOR_IDEA_MIN && n <= VECTOR_IDEA_MAX;
};

const clean = (text: string) => text.replace(/\s+/g, " ").replace(/[[\]]/g, "").trim();

const neutral = (idea: string) => idea.replace(/```/g, "'''").replace(/"""/g, "'''").trim();

const orientation = (w: number, h: number) => (w === h ? "persegi" : w > h ? "lebar" : "tinggi");

function referenceSection(refs: VectorReference[]): string[] {
  const lines = refs.map((r, i) => {
    const note = clean(r.note).slice(0, VECTOR_NOTE_MAX);
    return `· Gambar ${i + 1} — ${r.name}: ${r.width}×${r.height} px, ${orientation(r.width, r.height)}${note ? ` — ${note}` : ""}`;
  });
  return [
    "GAMBAR REFERENSI (dilampirkan terpisah bersama prompt ini):",
    ...lines,
    "· Gambar ini hanya acuan visual: lihat bentuk, warna, dan komposisinya.",
    "· Gambar ulang dengan bentuk SVG sendiri. Jangan menyisipkan gambar itu ke dalam SVG (tanpa <image>, base64, atau URL).",
    "· Tiru bentuk utama dan palet warnanya, lalu sederhanakan menjadi bentuk vektor yang bersih.",
    "· Jangan menyalin teks, logo, atau merek yang tampak di gambar referensi.",
    "",
  ];
}

export function buildVectorPrompt(p: VectorInput): string {
  const style = VECTOR_STYLES.find((s) => s.id === p.style) ?? VECTOR_STYLES[0];
  const format = VECTOR_FORMATS.find((f) => f.id === p.format) ?? VECTOR_FORMATS[0];
  const colors = Math.min(VECTOR_COLORS_MAX, Math.max(VECTOR_COLORS_MIN, Math.round(p.colors)));
  const refs = p.withReference === false ? [] : (p.references ?? []);

  const rules = [
    `Tulis satu elemen <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${format.width} ${format.height}"> tanpa atribut width dan height.`,
    "Elemen yang boleh dipakai hanya: g, path, rect, circle, ellipse, line, polyline, polygon, defs, linearGradient, radialGradient, stop, clipPath. Dilarang: script, style, image, foreignObject, text, filter, animasi, href eksternal, font.",
    "Beri id yang bermakna pada setiap bagian atau grup (huruf kecil, angka, garis bawah, mis. piring, lingkaran_hitam, bayangan). Bagian yang warnanya berbeda wajib berupa elemen terpisah, jangan digabung dalam satu path.",
    "Warna ditulis langsung di atribut fill dan stroke tiap elemen dengan kode hex (mis. fill=\"#d62828\"). Jangan pakai class, <style>, atau CSS.",
    "Urutkan elemen dari paling belakang ke paling depan.",
    "Pakai path dengan kurva halus dan jumlah titik secukupnya. Maksimal sekitar 150 elemen.",
    "Utamakan warna rata. Pakai gradasi hanya kalau deskripsi memintanya.",
    "Jangan ada logo, merek, watermark, atau karakter berlisensi.",
    "Bungkus output dalam satu blok ```svg tanpa penjelasan.",
  ];

  return [
    "Buat satu gambar vektor SVG dari deskripsi berikut.",
    "",
    "DESKRIPSI:",
    neutral(p.idea),
    "",
    ...(refs.length > 0 ? referenceSection(refs) : []),
    "PENGATURAN:",
    `· Gaya: ${style.ai}.`,
    `· Ukuran kanvas: ${format.width}×${format.height} (viewBox 0 0 ${format.width} ${format.height}).`,
    `· Palet: maksimal ${colors} warna utama, harmonis.`,
    p.transparent
      ? "· Latar: transparan. Jangan menggambar bentuk latar yang memenuhi kanvas; gambar hanya objeknya, di tengah dengan margin sekitar 8%."
      : "· Latar: gambar satu bentuk latar polos yang memenuhi kanvas (beri id \"latar\"), lalu objeknya di atasnya.",
    "",
    "ATURAN SVG:",
    ...rules.map((r) => `· ${r}`),
  ].join("\n");
}
