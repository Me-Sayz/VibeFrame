import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { issueLicense } from "../src/lib/license";

function loadEnv() {
  try {
    const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
}

loadEnv();

const [daysArg, ...labelParts] = process.argv.slice(2);
const days = Number(daysArg);

if (!daysArg || !Number.isFinite(days)) {
  console.log('Pemakaian: npx tsx scripts/make-license.ts <jumlah-hari> ["nama pembeli"]');
  console.log('Contoh:    npx tsx scripts/make-license.ts 30 "Budi"');
  process.exit(1);
}

try {
  const { code, expiresAt } = issueLicense({ days });
  console.log("");
  console.log(`Kode lisensi : ${code}`);
  console.log(`Berlaku      : ${days} hari, sampai ${new Date(expiresAt).toLocaleString("id-ID")}`);
  if (labelParts.length) console.log(`Untuk        : ${labelParts.join(" ")}`);
  console.log("");
  console.log("Catat kode ini di tempat pribadimu. Jangan simpan di dalam repo.");
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
}