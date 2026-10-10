import { extractCode, validateCode } from "./validate";

export interface LintResult {
  level: "empty" | "clean" | "error";
  message: string;
}

export function lintCode(raw: string, layerNames?: string[]): LintResult {
  const code = extractCode(raw);
  if (!code) return { level: "empty", message: "Belum ada kode." };

  const problem = validateCode(code, layerNames);
  if (problem) return { level: "error", message: problem };

  try {
    new Function(code);
  } catch (e) {
    return { level: "error", message: `Syntax error: ${e instanceof Error ? e.message : String(e)}` };
  }
  return { level: "clean", message: "Kode bersih, tidak ada syntax error." };
}