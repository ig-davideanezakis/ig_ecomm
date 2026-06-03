import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateTotpSecret, generateTotpQrCode } from "@/lib/totp";
import { pool } from "@/lib/db";

/**
 * POST /api/auth/totp-setup
 * Generates a new TOTP secret for the current user and returns the
 * QR code data URL. The secret is saved to the user's record but
 * 2FA is NOT enabled yet — the user must verify with a first code.
 */
export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email ?? "user@infografstore.it";
  const secret = generateTotpSecret();
  const qrCode = await generateTotpQrCode(secret, email);

  // Save secret to DB (not yet enabled)
  await pool.query(
    `UPDATE "user" SET totp_secret = $1 WHERE id = $2`,
    [secret, session.user.id],
  );

  return NextResponse.json({ secret, qrCode });
}
