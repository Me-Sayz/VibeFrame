export const VECTOR_STYLES = [
  {
    id: "flat",
    label: "Flat",
    hint: "Warna rata tanpa gradasi, bentuk sederhana dan bersih.",
    art: [
      "Flat vector: siluet jelas dan langsung dikenali, warna rata tanpa gradasi dan tanpa outline.",
      "Pisahkan bentuk lewat perbedaan warna, bukan garis tepi.",
      "Pakai sudut membulat dengan radius yang konsisten supaya terasa ramah dan rapi.",
      "Hemat detail kecil: cukup bentuk utama dan 2-3 detail pendukung yang berarti.",
    ],
  },
  {
    id: "line",
    label: "Garis (outline)",
    hint: "Gambar dari garis dengan ketebalan seragam, bagian dalam kosong atau diberi warna tipis.",
    art: [
      "Line art: seluruh gambar dari garis (stroke) dengan ketebalan seragam, fill=\"none\" untuk bentuk yang hanya berupa garis.",
      "Ujung dan sambungan garis bulat (stroke-linecap=\"round\", stroke-linejoin=\"round\"); bentuk utuh ditutup rapi.",
      "Boleh menambah 1-2 area warna rata yang lembut di belakang garis, digeser sedikit dari garisnya, sebagai aksen.",
      "Jangan mencampur banyak ketebalan garis; satu garis aksen yang lebih tebal masih boleh.",
    ],
  },
  {
    id: "geometric",
    label: "Geometris",
    hint: "Dibangun dari lingkaran, persegi, dan segitiga yang rapi.",
    art: [
      "Geometris: bangun dari bentuk dasar (circle, rect, polygon, busur) dengan sudut presisi dan lingkaran sempurna.",
      "Utamakan simetri atau susunan grid yang seimbang; hindari kurva bebas kecuali busur.",
      "Pakai sedikit warna dengan kontras tegas; ulangi bentuk yang sama untuk menciptakan ritme.",
    ],
  },
  {
    id: "semiflat",
    label: "Semi-flat (ada bayangan)",
    hint: "Flat dengan lapisan bayangan dan sorotan berupa bentuk warna rata, bukan gradasi.",
    art: [
      "Semi-flat: dasarnya flat vector, diberi volume lewat lapisan bayangan dan sorotan berupa bentuk warna rata, bukan gradasi.",
      "Cukup 1 tingkat bayangan dan 1 sorotan per objek besar; bayangan jatuh ke arah yang sama di semua objek.",
      "Boleh menambah bayangan lantai berupa ellipse gelap dengan opacity 0.15-0.25 di bawah objek.",
    ],
  },
] as const;

export type VectorStyle = (typeof VECTOR_STYLES)[number]["id"];

export const VECTOR_FORMATS = [
  { id: "square", label: "Persegi 1:1", width: 1000, height: 1000 },
  { id: "wide", label: "Lebar 16:9", width: 1600, height: 900 },
  { id: "tall", label: "Tinggi 9:16", width: 900, height: 1600 },
] as const;

export type VectorFormat = (typeof VECTOR_FORMATS)[number]["id"];

export const VECTOR_DETAILS = [
  { id: "simple", label: "Sederhana", hint: "Bentuk utama saja, paling mudah diubah warnanya.", ai: "Sederhana: 8-25 elemen, hanya bentuk utama dan 1-2 detail." },
  { id: "medium", label: "Sedang", hint: "Bentuk utama, detail pendukung, dan bayangan.", ai: "Sedang: 25-60 elemen, bentuk utama, detail pendukung, serta bayangan atau sorotan." },
  { id: "rich", label: "Detail", hint: "Lebih kaya, tapi bagiannya lebih banyak.", ai: "Detail: 60-120 elemen, kaya detail namun tetap rapi; tiap detail harus tetap terbaca saat gambar diperkecil." },
] as const;

export type VectorDetail = (typeof VECTOR_DETAILS)[number]["id"];

export const VECTOR_PALETTES = [
  { id: "auto", label: "Otomatis", ai: "" },
  { id: "warm", label: "Hangat", ai: "hangat (merah, oranye, kuning, krem, cokelat muda)" },
  { id: "cool", label: "Sejuk", ai: "sejuk (biru, tosca, ungu, hijau mint)" },
  { id: "pastel", label: "Pastel", ai: "pastel lembut (saturasi rendah, terang, kontras halus)" },
  { id: "vivid", label: "Cerah", ai: "cerah dan kontras tinggi (warna jenuh, ditambah satu warna netral gelap)" },
  { id: "mono", label: "Monokrom", ai: "monokrom (satu rona dengan 4-5 tingkat terang-gelap, ditambah satu warna aksen)" },
  { id: "earth", label: "Alami", ai: "alami (hijau zaitun, cokelat tanah, krem, terakota)" },
] as const;

export type VectorPalette = (typeof VECTOR_PALETTES)[number]["id"];

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
  detail?: VectorDetail;
  palette?: VectorPalette;
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

const bullets = (lines: readonly string[]) => lines.map((l) => `· ${l}`);

function referenceSection(refs: VectorReference[], colors: number): string[] {
  const lines = refs.map((r, i) => {
    const note = clean(r.note).slice(0, VECTOR_NOTE_MAX);
    return `· Gambar ${i + 1} — ${r.name}: ${r.width}×${r.height} px, ${orientation(r.width, r.height)}${note ? ` — ${note}` : ""}`;
  });
  return [
    "GAMBAR REFERENSI (dilampirkan terpisah bersama prompt ini):",
    ...lines,
    "Cara memakai gambar referensi:",
    ...bullets([
      "Analisis dulu di pikiranmu: siluet utama, warna-warna dominan, bagian mana yang berbeda warna, dan urutannya dari belakang ke depan.",
      "Gambar ulang dengan bentuk SVG yang bersih. Ikuti proporsi, komposisi, dan palet warnanya, tetapi sederhanakan detail halus, tekstur, dan noise menjadi bentuk berwarna rata.",
      `Perkirakan kode hex warna dari gambar, lalu rapikan menjadi maksimal ${colors} warna utama.`,
      "Satu bagian dengan warna berbeda menjadi satu elemen dengan id sendiri.",
      "Kalau deskripsi dan gambar berbeda, ikuti deskripsi untuk gaya dan perubahan yang diminta, dan ikuti gambar untuk bentuk dan komposisi.",
      "Jangan menyisipkan gambar itu ke dalam SVG (tanpa <image>, base64, atau URL). Jangan menyalin teks, logo, atau merek yang tampak di gambar.",
    ]),
    "",
  ];
}

export function buildVectorPrompt(p: VectorInput): string {
  const style = VECTOR_STYLES.find((s) => s.id === p.style) ?? VECTOR_STYLES[0];
  const format = VECTOR_FORMATS.find((f) => f.id === p.format) ?? VECTOR_FORMATS[0];
  const detail = VECTOR_DETAILS.find((d) => d.id === p.detail) ?? VECTOR_DETAILS[1];
  const palette = VECTOR_PALETTES.find((x) => x.id === p.palette) ?? VECTOR_PALETTES[0];
  const colors = Math.min(VECTOR_COLORS_MAX, Math.max(VECTOR_COLORS_MIN, Math.round(p.colors)));
  const refs = p.withReference === false ? [] : (p.references ?? []);
  const { width: w, height: h } = format;
  const viewBox = `0 0 ${w} ${h}`;

  const paletteLine = palette.ai
    ? `Palet: maksimal ${colors} warna utama bernuansa ${palette.ai}.`
    : refs.length > 0
      ? `Palet: ambil dari gambar referensi, maksimal ${colors} warna utama.`
      : `Palet: pilih sendiri yang paling cocok dengan tema, maksimal ${colors} warna utama yang harmonis.`;

  const background = p.transparent
    ? `Latar: transparan. Jangan menggambar bentuk latar yang memenuhi kanvas. Gambar hanya objeknya, di tengah, dengan margin sekitar 8% di semua sisi.`
    : `Latar: satu <rect id="latar" x="0" y="0" width="${w}" height="${h}"> polos di paling belakang, dengan warna yang kontras cukup terhadap objek utama.`;

  return [
    "Kamu ilustrator vektor profesional yang membuat gambar untuk microstock. Buat satu gambar SVG dari deskripsi berikut.",
    "",
    "DESKRIPSI:",
    neutral(p.idea),
    "",
    ...(refs.length > 0 ? referenceSection(refs, colors) : []),
    "PENGATURAN:",
    ...bullets([
      `Ukuran kanvas: ${w}×${h} (viewBox ${viewBox}).`,
      `Tingkat detail: ${detail.ai}`,
      paletteLine,
      background,
    ]),
    "",
    "ARAHAN GAYA:",
    ...bullets(style.art),
    "",
    "PROSES (kerjakan di pikiranmu, jangan ditulis):",
    ...bullets([
      "Tentukan objek utama dan beberapa detail pendukung. Rancang siluet dan komposisinya dulu, baru detailnya.",
      "Tentukan palet, lalu pilih kode hex tetap untuk tiap peran warna.",
      "Susun urutan layer dari paling belakang ke paling depan, lalu tulis SVG-nya.",
    ]),
    "",
    "KOMPOSISI:",
    ...bullets([
      "Objek utama jadi titik fokus dan mengisi sekitar 70-85% kanvas. Tidak ada bagian penting yang terpotong tepi kanvas.",
      "Pakai satu arah cahaya yang sama (dari kiri atas) untuk semua bayangan dan sorotan.",
      "Buat bentuk utama terbaca jelas saat gambar diperkecil. Detail yang lebih kecil dari 1% lebar kanvas dan garis yang terlalu tipis dihindari.",
      "Semua bentuk berada di dalam viewBox.",
    ]),
    "",
    "WARNA:",
    ...bullets([
      "Bagi warna kira-kira 60% dominan, 30% pendukung, 10% aksen.",
      "Hindari hitam #000000 dan putih #ffffff murni kecuali deskripsi memintanya; pakai hitam kebiruan seperti #1b1f2a dan putih krem seperti #f7f3ea.",
      "Bayangan = warna dasar yang lebih gelap dan sedikit bergeser ke biru atau ungu. Sorotan = warna dasar yang lebih terang dan sedikit hangat. Tulis keduanya sebagai kode hex tetap.",
      "Pakai kode hex yang PERSIS sama untuk bagian yang warnanya sama. Jangan membuat variasi tipis seperti #d62828 dan #d52929, supaya gambar mudah diubah warnanya per warna.",
      "Utamakan warna rata. Gradasi hanya kalau deskripsi memintanya, maksimal 1-2 gradasi sederhana (2-3 stop) dengan id unik.",
    ]),
    "",
    "STRUKTUR (supaya mudah diedit per bagian):",
    ...bullets([
      "Kelompokkan tiap objek dalam <g id=\"nama_objek\">. Beri id yang bermakna pada setiap elemen (huruf kecil, angka, garis bawah).",
      "Bagian yang warnanya berbeda wajib elemen terpisah, jangan digabung dalam satu path.",
      "Bayangan dan sorotan adalah elemen terpisah dengan id seperti bayangan_objek dan sorotan_objek, diletakkan tepat di atas bentuk dasarnya, dan tidak keluar dari siluet bentuk dasar itu.",
      "Jangan membuat bentuk ganda yang sama atau bentuk yang tertutup penuh oleh bentuk lain. Hindari clipPath kecuali benar-benar perlu.",
    ]),
    "",
    "KUALITAS BENTUK:",
    ...bullets([
      "Pakai circle, ellipse, atau rect (dengan rx) untuk bentuk geometris. Pakai path hanya untuk bentuk organik.",
      "Path memakai kurva Bezier (C, S, Q) yang halus, tanpa titik bergerigi. Bentuk berisi selalu ditutup dengan Z. Koordinat bilangan bulat atau maksimal 1 desimal.",
      "Untuk garis, ketebalan konsisten (sekitar 1-2% lebar kanvas) dengan ujung dan sambungan bulat.",
    ]),
    "",
    "CONTOH STRUKTUR (hanya contoh format dan penamaan, jangan meniru isinya):",
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">`,
    `  <g id="objek"><circle id="badan_objek" cx="${w / 2}" cy="${h / 2}" r="${Math.round(Math.min(w, h) * 0.3)}" fill="#c8553d"/><path id="sorotan_objek" d="M420 420 C450 380 520 370 560 400 Z" fill="#e07a5f"/></g>`,
    "</svg>",
    "",
    "FORMAT OUTPUT:",
    ...bullets([
      `Tulis satu elemen <svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"> tanpa atribut width dan height.`,
      "Elemen yang boleh dipakai hanya: g, path, rect, circle, ellipse, line, polyline, polygon, defs, linearGradient, radialGradient, stop, clipPath. Dilarang: script, style, image, foreignObject, text, filter, mask, animasi, href eksternal, font.",
      "Warna ditulis langsung di atribut fill dan stroke tiap elemen dengan kode hex (mis. fill=\"#d62828\"). Jangan pakai class, <style>, atau CSS.",
      "Maksimal sekitar 150 elemen. Jangan ada logo, merek, watermark, atau karakter berlisensi.",
      "Karakter & ditulis sebagai &amp;.",
      "Bungkus output dalam satu blok ```svg tanpa penjelasan.",
    ]),
    "",
    "PERIKSA SEBELUM MENJAWAB: semua tag tertutup, XML valid, id unik, tidak ada elemen terlarang, tidak ada bentuk di luar viewBox, jumlah warna tidak melebihi batas, urutan layer dari belakang ke depan.",
  ].join("\n");
}
