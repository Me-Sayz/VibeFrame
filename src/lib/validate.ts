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

export function validateCode(code: string): string | null {
  if (code.length > MAX_CODE_LENGTH) return "Kode terlalu panjang.";
  for (const rule of BLOCKED) {
    if (rule.pattern.test(code)) return rule.message;
  }
  if (!/function\s+draw\s*\(|(?:const|let|var)\s+draw\s*=/.test(code)) {
    return "Kode tidak berisi function draw(ctx, time, width, height).";
  }
  return null;
}