import type { Concept, Style } from "@/types";

export interface VisualInfo {
  hint: string;
  ai: string;
}

export const STYLE_INFO: Record<Style, VisualInfo> = {
  Vector: {
    hint: "Bentuk solid dan bersih, warna rata, tepi tajam. Seperti ilustrasi vektor di Illustrator.",
    ai: "bentuk solid yang bersih dengan tepi tajam dan warna rata, tanpa tekstur, detail seperlunya.",
  },
  "Semi-3D": {
    hint: "Ada gradasi, highlight, dan bayangan lembut sehingga objek tampak berkedalaman, tetap gaya ilustrasi.",
    ai: "bentuk dengan gradasi lembut (createLinearGradient atau createRadialGradient), highlight, dan bayangan ringan agar terlihat punya volume, tetap bergaya ilustrasi dan bukan fotorealistik.",
  },
  Minimal: {
    hint: "Sedikit elemen, banyak ruang kosong, satu objek utama, 2–3 warna. Bersih dan tenang.",
    ai: "sedikit elemen, banyak ruang kosong, satu objek utama, palet 2–3 warna, tanpa dekorasi berlebihan.",
  },
  Cartoon: {
    hint: "Garis tepi tebal, bentuk membulat, gerakan membal dan ekspresif (squash and stretch).",
    ai: "garis tepi tebal dan seragam, bentuk membulat dan ekspresif, gerakan membal dengan squash and stretch dan sedikit overshoot.",
  },
  "Detail tinggi": {
    hint: "Banyak lapisan: latar berlapis, pola, partikel, dan pencahayaan. Lebih ramai tapi tetap rapi.",
    ai: "banyak lapisan detail: latar berlapis dengan efek parallax, pola, partikel, dan pencahayaan, tetap rapi dan terbaca. Batasi jumlah bentuk agar render tetap cepat.",
  },
};

export const CONCEPT_INFO: Record<Concept, VisualInfo> = {
  "Flat vector": {
    hint: "Warna rata tanpa gradasi dan bayangan, bentuk geometris sederhana. Gaya paling umum di stok.",
    ai: "warna rata tanpa gradasi dan bayangan, bentuk geometris sederhana.",
  },
  "Gradient modern": {
    hint: "Gradasi halus dua sampai tiga warna di latar dan objek. Kesan segar dan digital.",
    ai: "gradasi warna halus (dua sampai tiga warna) di latar dan objek, kesan segar, modern, dan digital.",
  },
  Isometric: {
    hint: "Sudut pandang miring 30° tanpa perspektif, objek berbentuk kotak dengan tiga sisi beda terang.",
    ai: "proyeksi isometrik (sudut 30 derajat, tanpa perspektif), objek bersudut dengan tiga sisi berbeda tingkat terang untuk kesan 3D.",
  },
  "Line art": {
    hint: "Hanya garis dengan ketebalan seragam, hampir tanpa isi warna. Cocok untuk animasi garis yang tergambar bertahap.",
    ai: "hanya garis dengan ketebalan konsisten dan isi warna minimal, garis bersih. Bila cocok, animasikan dengan menggambar garis bertahap (lineDash).",
  },
  "Neon glow": {
    hint: "Latar gelap, garis dan bentuk terang berpendar neon (cyan, magenta, kuning).",
    ai: "latar gelap, garis dan bentuk terang berpendar neon (cyan, magenta, kuning). Buat glow dari beberapa lapis garis transparan, jangan pakai shadowBlur besar.",
  },
  "Paper cut": {
    hint: "Lapisan bentuk seperti kertas gunting yang bertumpuk, tiap lapis punya bayangan lembut di bawahnya.",
    ai: "lapisan bentuk seperti kertas gunting yang bertumpuk, tiap lapisan punya bayangan lembut dengan offset kecil, warna matte.",
  },
  "Low poly": {
    hint: "Permukaan dari segitiga datar dengan tingkat terang berbeda. Terlihat seperti kristal atau model 3D kasar.",
    ai: "permukaan tersusun dari segitiga datar (facet) dengan tingkat terang berbeda tiap segitiga, tanpa gradasi halus.",
  },
  "Pixel art": {
    hint: "Gambar dari kotak-kotak besar dengan warna terbatas, bergerak per langkah. Nuansa game retro.",
    ai: "gaya piksel: gambar pada grid kasar (satu piksel = beberapa unit s), matikan ctx.imageSmoothingEnabled, palet terbatas, gerakan per langkah piksel.",
  },
  Glassmorphism: {
    hint: "Panel kaca semi-transparan dengan tepi terang tipis di atas latar gradasi berwarna.",
    ai: "panel kaca semi-transparan dengan tepi terang tipis dan gradasi alpha di atas latar gradasi berwarna. Pakai alpha, bukan ctx.filter.",
  },
  "Retro synthwave": {
    hint: "Gaya 80-an: langit gradasi ungu-pink-oranye, matahari bergaris, grid perspektif bergerak.",
    ai: "gaya retro 80-an: langit gradasi ungu, pink, dan oranye, matahari bergaris, grid perspektif yang bergerak, bentuk neon.",
  },
  Duotone: {
    hint: "Hanya dua warna dominan dengan variasi terang dan gelap, kontras tinggi. Kesan poster.",
    ai: "hanya dua warna dominan dengan variasi terang dan gelap, kontras tinggi, kesan poster.",
  },
  Doodle: {
    hint: "Seperti coretan tangan: garis agak tidak rata, warna sedikit bergeser dari garis. Santai dan ramah.",
    ai: "gaya coretan tangan: garis sedikit tidak rata (jitter deterministik dari seed tetap), isi warna sedikit bergeser dari garis, bentuk tidak sempurna namun menarik.",
  },
};
