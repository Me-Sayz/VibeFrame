import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const FEATURES = { ai: 1 } as const;
export type Feature = keyof typeof FEATURES;

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const CONTEXT = "vibeframe-license-v1";
const PAYLOAD_BYTES = 7;
const TAG_BYTES = 8;
const BODY_CHARS = 24;
const MIN_SECRET = 24;
const MAX_DAYS = 3650;

export interface License {
  features: Feature[];
  expiresAt: number;
}

export type LicenseFailure = "missing" | "format" | "signature" | "blocked" | "expired" | "feature" | "config";

export type LicenseResult =
  | { ok: true; license: License; code: string }
  | { ok: false; reason: LicenseFailure; expiresAt?: number };

const getSecret = () => {
  const secret = process.env.LICENSE_SECRET?.trim();
  return secret && secret.length >= MIN_SECRET ? secret : null;
};

const encode32 = (bytes: Uint8Array) => {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
      value &= (1 << bits) - 1;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
};

const decode32 = (text: string) => {
  if (text.length !== BODY_CHARS) return null;
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of text) {
    const index = ALPHABET.indexOf(ch);
    if (index < 0) return null;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
      value &= (1 << bits) - 1;
    }
  }
  return Buffer.from(out);
};

const normalize = (raw: string) =>
  raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");

const pretty = (body: string) => `VF-${body.match(/.{4}/g)?.join("-") ?? body}`;

const sign = (payload: Buffer, secret: string) =>
  createHmac("sha256", secret).update(CONTEXT).update(payload).digest().subarray(0, TAG_BYTES);

const isBlocked = (normalized: string) =>
  (process.env.LICENSE_BLOCKLIST ?? "")
    .split(",")
    .map(normalize)
    .filter(Boolean)
    .includes(normalized);

export function issueLicense(options: { days: number; features?: Feature[]; now?: number }) {
  const secret = getSecret();
  if (!secret) throw new Error(`LICENSE_SECRET belum diatur atau kurang dari ${MIN_SECRET} karakter.`);
  const { days, features = ["ai"], now = Date.now() } = options;
  if (!Number.isFinite(days) || days <= 0 || days > MAX_DAYS) throw new Error(`Jumlah hari harus 0 sampai ${MAX_DAYS}.`);

  const expiresSec = Math.floor((now + days * 86_400_000) / 1000);
  const payload = Buffer.alloc(PAYLOAD_BYTES);
  payload[0] = features.reduce((flags, f) => flags | FEATURES[f], 0);
  payload.writeUInt32BE(expiresSec, 1);
  randomBytes(2).copy(payload, 5);

  const body = encode32(Buffer.concat([payload, sign(payload, secret)]));
  return { code: pretty(body), expiresAt: expiresSec * 1000 };
}

export function verifyLicense(raw: unknown, need?: Feature, now = Date.now()): LicenseResult {
  if (typeof raw !== "string" || raw.trim() === "") return { ok: false, reason: "missing" };
  const secret = getSecret();
  if (!secret) return { ok: false, reason: "config" };

  const normalized = normalize(raw.slice(0, 80));
  if (!normalized.startsWith("VF")) return { ok: false, reason: "format" };
  const body = normalized.slice(2);
  const bytes = decode32(body);
  if (!bytes) return { ok: false, reason: "format" };

  const payload = bytes.subarray(0, PAYLOAD_BYTES);
  const tag = bytes.subarray(PAYLOAD_BYTES);
  if (!timingSafeEqual(tag, sign(payload, secret))) return { ok: false, reason: "signature" };

  const expiresAt = payload.readUInt32BE(1) * 1000;
  const flags = payload[0];
  const features = (Object.keys(FEATURES) as Feature[]).filter((f) => (flags & FEATURES[f]) !== 0);

  if (isBlocked(normalized)) return { ok: false, reason: "blocked" };
  if (expiresAt <= now) return { ok: false, reason: "expired", expiresAt };
  if (need && !features.includes(need)) return { ok: false, reason: "feature" };
  return { ok: true, license: { features, expiresAt }, code: pretty(body) };
}

const stamp = (ms: number) => `${new Date(ms).toISOString().slice(0, 16).replace("T", " ")} UTC`;

export function licenseMessage(result: Extract<LicenseResult, { ok: false }>) {
  switch (result.reason) {
    case "missing":
      return "Fitur ini butuh lisensi. Masukkan kode lisensi lewat tombol 🔑 Lisensi di header.";
    case "format":
    case "signature":
      return "Kode lisensi tidak valid. Periksa lagi penulisannya.";
    case "blocked":
      return "Kode lisensi ini sudah dinonaktifkan.";
    case "expired":
      return `Lisensi sudah kedaluwarsa${result.expiresAt ? ` pada ${stamp(result.expiresAt)}` : ""}.`;
    case "feature":
      return "Lisensi ini tidak mencakup fitur tersebut.";
    case "config":
      return "Server belum diatur untuk lisensi. Isi LICENSE_SECRET di .env.local lalu restart server.";
  }
}