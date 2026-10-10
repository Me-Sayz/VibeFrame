const MAX_CODE_LENGTH = 100_000;

const BLOCKED: { pattern: RegExp; message: string }[] = [
  {
    pattern: /<\/?(html|script|body|head)\b|<!doctype/i,
    message: "Output berisi HTML. Yang dibutuhkan hanya kode JavaScript.",
  },
  {
    pattern: /\bwhile\s*\(\s*(true|1)\s*\)|\bfor\s*\(\s*;\s*;\s*\)/,
    message: "Kode mengandung loop tanpa batas (while(true) / for(;;)).",
  },
  {
    pattern:
      /\b(fetch|XMLHttpRequest|WebSocket|EventSource|importScripts|postMessage|eval|globalThis)\b|\bnew\s+(Function|Image|Worker)\b|^\s*import\s|\bimport\s*\(/m,
    message: "Kode memakai fitur yang tidak diizinkan (jaringan, import, eval, atau akses global).",
  },
];

export function extractCode(text: string): string {
  const m = text.match(/```(?:javascript|js)?[ \t]*\r?\n?([\s\S]*?)(?:```|$)/i);
  return (m ? m[1] : text).trim();
}

const ASSETS_PARAM = /function\s+draw\s*\([^)]*\bassets\b|(?:const|let|var)\s+draw\s*=\s*(?:function\s*)?\([^)]*\bassets\b/;

export function usedLayers(code: string): string[] {
  if (!ASSETS_PARAM.test(code)) return [];
  const found = new Set<string>();
  for (const m of code.matchAll(/\bassets\s*\.\s*([A-Za-z_$][\w$]*)/g)) found.add(m[1]);
  for (const m of code.matchAll(/\bassets\s*\[\s*(["'])(.*?)\1\s*\]/g)) found.add(m[2]);
  return [...found];
}

function checkLayers(code: string, available: string[]): string | null {
  const missing = usedLayers(code).filter((n) => !available.includes(n));
  if (!missing.length) return null;
  if (!available.length) {
    return `Kode memakai assets.${missing[0]}, tetapi belum ada layer gambar. Unggah di tab Assets lalu coba lagi.`;
  }
  return `Kode memakai layer yang tidak ada: ${missing.join(", ")}. Layer yang tersedia: ${available.join(", ")}.`;
}

export function validateCode(code: string, layerNames?: string[]): string | null {
  if (code.length > MAX_CODE_LENGTH) return "Kode terlalu panjang.";
  for (const rule of BLOCKED) {
    if (rule.pattern.test(code)) return rule.message;
  }
  if (!/function\s+draw\s*\(|(?:const|let|var)\s+draw\s*=/.test(code)) {
    return "Kode tidak berisi function draw(ctx, time, width, height).";
  }
  return layerNames ? checkLayers(code, layerNames) : null;
}