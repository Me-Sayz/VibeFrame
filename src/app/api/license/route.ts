import { NextResponse } from "next/server";
import { licenseMessage, verifyLicense } from "@/lib/license";
import { clientIp, isLimited } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TRIES = 30;
const WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: Request) {
  if (isLimited(`license:${clientIp(req)}`, MAX_TRIES, WINDOW_MS)) {
    return NextResponse.json({ valid: false, message: "Terlalu banyak percobaan. Tunggu beberapa menit." }, { status: 429 });
  }

  let code: unknown;
  try {
    code = ((await req.json()) as { code?: unknown }).code;
  } catch {
    return NextResponse.json({ valid: false, message: "Isi permintaan tidak valid." }, { status: 400 });
  }

  const result = verifyLicense(code);
  if (result.ok) {
    return NextResponse.json({
      valid: true,
      code: result.code,
      expiresAt: result.license.expiresAt,
      features: result.license.features,
    });
  }
  return NextResponse.json(
    { valid: false, reason: result.reason, expiresAt: result.expiresAt, message: licenseMessage(result) },
    { status: result.reason === "config" ? 500 : 200 }
  );
}