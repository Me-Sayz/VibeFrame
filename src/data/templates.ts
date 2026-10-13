import type { Concept, Style } from "@/types";

export interface VisualTemplate {
  id: string;
  name: string;
  style: Style;
  concept: Concept;
  description: string;
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
      },
      {
        id: "startup-infographic",
        name: "Startup Infographic",
        style: "Semi-3D",
        concept: "Isometric",
        description: "Objek presisi bersudut miring dengan ilusi ruang dan volume. Memberikan kesan teknikal, rapi, dan profesional.",
      },
      {
        id: "bento-grid",
        name: "Bento Grid Layout",
        style: "Minimal",
        concept: "Flat vector",
        trending: true,
        description: "Komposisi objek terbagi rapi dalam kotak-kotak bersudut tumpul ala kotak bento di UI Apple. Sangat modern dan minimalis.",
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
      },
      {
        id: "data-network",
        name: "Data Network / AI",
        style: "Minimal",
        concept: "Plexus / Network Nodes",
        description: "Titik-titik partikel yang perlahan melayang dan saling terhubung membentuk jaring digital. Wajib untuk visual bertema AI.",
      },
      {
        id: "scifi-dashboard",
        name: "Sci-Fi Dashboard",
        style: "Detail tinggi",
        concept: "Sci-Fi HUD",
        description: "Tampilan layar antarmuka fiksi ilmiah dengan cincin berputar, angka digital berjalan, dan bidikan layar.",
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
      },
      {
        id: "liquid-flow",
        name: "Liquid Flow",
        style: "Minimal",
        concept: "Abstract Fluid / Liquid Blob",
        description: "Bentuk cairan organik tak beraturan (seperti lampu lava) yang memuai dan bergerak dengan gerakan organik super mulus.",
      },
      {
        id: "artsy-diorama",
        name: "Artsy Diorama",
        style: "Semi-3D",
        concept: "Paper cut",
        description: "Visual meniru tumpukan kertas karton berlapis-lapis. Memberikan tekstur kerajinan tangan dengan kedalaman drop shadow.",
      },
      {
        id: "duotone-poster",
        name: "Duotone Poster",
        style: "Minimal",
        concept: "Duotone",
        description: "Gaya artistik yang ketat hanya menggunakan dua warna kontras untuk seluruh karya. Minimalis dan sangat mencolok.",
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
      },
      {
        id: "retro-arcade",
        name: "Retro Arcade (HD-2D)",
        style: "Semi-3D",
        concept: "Pixel art",
        description: "Nostalgia game klasik lewat blok piksel kasar, namun dipercantik efek pencahayaan dan bayangan bergaya 3D modern.",
      },
      {
        id: "synthwave-sunset",
        name: "Synthwave Sunset",
        style: "Semi-3D",
        concept: "Retro synthwave",
        description: "Estetika 80-an dengan matahari terbenam bergaris, grid lantai bersinar neon, dan palet warna ungu/pink retro.",
      },
      {
        id: "pop-art-memphis",
        name: "Pop-Art Memphis",
        style: "Minimal",
        concept: "Memphis Style",
        description: "Pola geometri acak (polkadot, zigzag, gelombang) dengan warna ngejreng. Ceria dan dinamis untuk konten anak muda.",
      },
    ],
  },
];

export const TEMPLATES: VisualTemplate[] = TEMPLATE_CATEGORIES.flatMap((c) => c.items);

export const templateLabel = (t: VisualTemplate) => `${t.trending ? "🔥 " : ""}${t.name} (${t.style} + ${t.concept})`;

export function findTemplate(style: Style | "", concept: Concept | ""): VisualTemplate | undefined {
  return TEMPLATES.find((t) => t.style === style && t.concept === concept);
}
