import type { Concept, Style } from "@/types";

export interface VisualTemplate {
  id: string;
  name: string;
  style: Style;
  concept: Concept;
  description: string;
  direction: string;
  trending?: boolean;
}

export interface TemplateCategory {
  label: string;
  items: VisualTemplate[];
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    label: "Corporate & Profesional",
    items: [
      {
        id: "corporate-premium",
        name: "Corporate Premium",
        style: "Minimal",
        concept: "Gradient modern",
        description: "Visual bersih dan elegan dengan transisi warna gradasi halus. Sangat cocok untuk background presentasi bisnis.",
        direction: "komposisi bersih dan lapang dengan latar gradasi halus bernuansa bisnis (biru, teal, atau ungu tua). Beberapa bentuk geometris lembut bergerak sangat pelan di tepi. Sisakan area tengah kosong supaya mudah dipakai sebagai latar presentasi, tanpa teks.",
      },
      {
        id: "startup-infographic",
        name: "Startup Infographic",
        style: "Semi-3D",
        concept: "Isometric",
        description: "Objek presisi bersudut miring dengan ilusi ruang dan volume. Memberikan kesan teknikal, rapi, dan profesional.",
        direction: "susunan objek isometrik seperti diagram bisnis: balok, platform, dan ikon sederhana (grafik batang, roda gigi, panah) tersusun rapi di grid miring dan bergerak atau muncul berurutan secara teratur. Palet cerah yang profesional, rapi, presisi, tanpa teks.",
      },
      {
        id: "bento-grid",
        name: "Bento Grid Layout",
        style: "Minimal",
        concept: "Flat vector",
        trending: true,
        description: "Komposisi objek terbagi rapi dalam kotak-kotak bersudut tumpul ala kotak bento di UI Apple. Sangat modern dan minimalis.",
        direction: "layar terbagi menjadi kotak-kotak (bento grid) berukuran berbeda dengan sudut membulat dan jarak antarkotak yang seragam. Tiap kotak berisi satu motif sederhana (ikon, grafik, atau pola) yang beranimasi pelan dan bergantian. Warna flat lembut, tiap kotak berbeda warna, tanpa teks.",
      },
    ],
  },
  {
    label: "Tech & Futuristik",
    items: [
      {
        id: "cyberpunk-hacker",
        name: "Cyberpunk Hacker",
        style: "Detail tinggi",
        concept: "Neon glow",
        description: "Latar belakang gelap gulita dengan elemen garis yang memancarkan cahaya neon terang. Cocok untuk gaming atau siber.",
        direction: "latar hampir hitam dengan garis neon cyan, magenta, dan hijau: grid atau jalur sirkuit, garis data yang mengalir, panel kecil berkedip. Glow dibuat dari beberapa lapis garis transparan, bukan shadowBlur besar. Suasana siber yang gelap, tanpa teks terbaca.",
      },
      {
        id: "data-network",
        name: "Data Network / AI",
        style: "Minimal",
        concept: "Plexus / Network Nodes",
        description: "Titik-titik partikel yang perlahan melayang dan saling terhubung membentuk jaring digital. Wajib untuk visual bertema AI.",
        direction: "titik-titik partikel melayang pelan dan saling terhubung garis tipis, sebagian titik berdenyut. Latar gelap biru tua atau navy dengan titik dan garis cyan atau putih. Kedalaman dari ukuran dan alpha titik yang berbeda. Kesan jaringan digital dan kecerdasan buatan.",
      },
      {
        id: "scifi-dashboard",
        name: "Sci-Fi Dashboard",
        style: "Detail tinggi",
        concept: "Sci-Fi HUD",
        description: "Tampilan layar antarmuka fiksi ilmiah dengan cincin berputar, angka digital berjalan, dan bidikan layar.",
        direction: "layar antarmuka fiksi ilmiah di latar gelap: cincin berputar, bidikan (crosshair) dan bracket di sudut layar, grafik garis dan batang yang bergerak, deretan angka digital yang berganti dengan ritme tetap. Satu warna utama (cyan atau oranye) dengan satu aksen.",
      },
    ],
  },
  {
    label: "Artsy & Estetik",
    items: [
      {
        id: "glass-ui",
        name: "Glass UI / Frosted Glass",
        style: "Detail tinggi",
        concept: "Glassmorphism",
        trending: true,
        description: "Efek lempengan kaca buram tembus pandang yang membiaskan warna di belakangnya. Sangat laku untuk showcase desain UI/UX.",
        direction: "beberapa panel kaca semi-transparan bersudut membulat yang saling bertumpuk dan melayang pelan di atas latar gradasi warna-warni dengan bola cahaya buram. Tepi panel punya garis terang tipis. Kesan showcase UI yang premium, tanpa teks.",
      },
      {
        id: "liquid-flow",
        name: "Liquid Flow",
        style: "Minimal",
        concept: "Abstract Fluid / Liquid Blob",
        description: "Bentuk cairan organik tak beraturan (seperti lampu lava) yang memuai dan bergerak dengan gerakan organik super mulus.",
        direction: "satu sampai tiga blob besar berwarna gradasi yang memuai, menyusut, dan menyatu pelan seperti lampu lava, di atas latar polos atau gradasi lembut. Tepi bentuk mulus dan gerakan sangat halus tanpa patah.",
      },
      {
        id: "artsy-diorama",
        name: "Artsy Diorama",
        style: "Semi-3D",
        concept: "Paper cut",
        description: "Visual meniru tumpukan kertas karton berlapis-lapis. Memberikan tekstur kerajinan tangan dengan kedalaman drop shadow.",
        direction: "adegan berlapis empat sampai enam lapisan kertas karton bertumpuk dengan bayangan lembut di tiap lapisan (misalnya bukit, pohon, awan, bulan). Tiap lapisan bergerak paralaks pelan dengan kecepatan berbeda. Warna matte yang hangat.",
      },
      {
        id: "duotone-poster",
        name: "Duotone Poster",
        style: "Minimal",
        concept: "Duotone",
        description: "Gaya artistik yang ketat hanya menggunakan dua warna kontras untuk seluruh karya. Minimalis dan sangat mencolok.",
        direction: "seluruh gambar hanya memakai dua warna kontras (satu terang, satu gelap) beserta variasi terang-gelapnya. Satu subjek besar yang kuat dengan komposisi poster yang berani. Jangan ada warna ketiga.",
      },
    ],
  },
  {
    label: "Retro & Playful",
    items: [
      {
        id: "hand-drawn",
        name: "Hand-Drawn Playful",
        style: "Cartoon",
        concept: "Doodle",
        description: "Estetika seperti digambar langsung dengan pena. Garis tepinya sedikit bergetar (boiling line) dengan gerakan membal ceria.",
        direction: "semua garis tampak digambar tangan dengan efek boiling line: garis bergetar halus beberapa kali per detik (deterministik dari seed tetap). Bentuk membulat dan lucu, warna cerah yang sedikit bergeser dari garisnya, gerakan membal yang ceria.",
      },
      {
        id: "retro-arcade",
        name: "Retro Arcade (HD-2D)",
        style: "Semi-3D",
        concept: "Pixel art",
        description: "Nostalgia game klasik lewat blok piksel kasar, namun dipercantik efek pencahayaan dan bayangan bergaya 3D modern.",
        direction: "latar dan objek dari blok piksel kasar bergaya game arcade klasik dengan palet terbatas, ditambah pencahayaan dan bayangan lembut ala 3D modern (HD-2D). Gerakan per langkah piksel. Kesan nostalgia game.",
      },
      {
        id: "synthwave-sunset",
        name: "Synthwave Sunset",
        style: "Semi-3D",
        concept: "Retro synthwave",
        description: "Estetika 80-an dengan matahari terbenam bergaris, grid lantai bersinar neon, dan palet warna ungu/pink retro.",
        direction: "matahari besar bergaris-garis di cakrawala, langit gradasi ungu, pink, dan oranye, grid lantai perspektif neon yang bergerak maju dengan mulus, siluet pegunungan atau pohon palem. Palet ungu, pink, dan cyan.",
      },
      {
        id: "pop-art-memphis",
        name: "Pop-Art Memphis",
        style: "Minimal",
        concept: "Memphis Style",
        description: "Pola geometri acak (polkadot, zigzag, gelombang) dengan warna ngejreng. Ceria dan dinamis untuk konten anak muda.",
        direction: "latar warna cerah solid atau pastel dengan sebaran pola Memphis (polkadot, zigzag, gelombang, segitiga, tanda plus) berwarna kontras. Bentuk melayang dan berputar pelan. Ceria, padat tetapi tetap rapi.",
      },
    ],
  },
];

export const TEMPLATES: VisualTemplate[] = TEMPLATE_CATEGORIES.flatMap((c) => c.items);

export const templateLabel = (t: VisualTemplate) => `${t.trending ? "🔥 " : ""}${t.name} (${t.style} + ${t.concept})`;

export function findTemplate(style: Style | "", concept: Concept | ""): VisualTemplate | undefined {
  return TEMPLATES.find((t) => t.style === style && t.concept === concept);
}
