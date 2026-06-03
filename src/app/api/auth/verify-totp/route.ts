import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyTotp } from "@/lib/totp";
import { pool } from "@/lib/db";

/**
 * POST /api/auth/verify-totp
 * Verifies a TOTP token for the current user.
 *
 * Two modes:
 * 1. Setup verification (setup=true): after scanning the QR code,
 *    the user provides the first code to confirm 2FA works.
 *    On success, totp_enabled is set to true.
 * 2. Login verification (setup=false, default): during login,
 *    the user provides their TOTP code. On success, the session
 *    is updated via NextAuth's session update mechanism.
 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token, setup } = await request.json();

  if (!token || typeof token !== "string" || token.length !== 6) {
    return NextResponse.json(
      { error: "Codice non valido. Inserisci 6 cifre." },
      { status: 400 },
    );
  }

  // Get user's TOTP secret from DB
  const result = await pool.query(
    `SELECT totp_secret FROM "user" WHERE id = $1`,
    [session.user.id],
  );

  if (result.rows.length === 0 || !result.rows[0].totp_secret) {
    return NextResponse.json(
      { error: "2FA non configurata. Configurala prima nelle impostazioni." },
      { status: 400 },
    );
  }

  const secret: string = result.rows[0].totp_secret;
  const isValid = await verifyTotp(token, secret);

  if (!isValid) {
    return NextResponse.json(
      { error: "Codice non valido. Riprova." },
      { status: 400 },
    );
  }

  // If this was a setup verification, enable 2FA permanently
  if (setup) {
    await pool.query(
      `UPDATE "user" SET totp_enabled = true WHERE id = $1`,
      [session.user.id],
    );
    return NextResponse.json({ success: true, enabled: true });
  }

  // Login verification — just return success.
  // The client will call `update({ totpVerified: true })` to
  // refresh the NextAuth session (removing needsTotp flag).
  return NextResponse.json({ success: true });
}
