import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import bcrypt from "bcryptjs";

/**
 * POST /api/auth/set-password-by-email
 * Sets a password for a CUSTOMER account identified by email.
 * Used for:
 *   - First-time password setup (account created without password)
 *   - Forgot password reset
 * Only works for CUSTOMER role. STAFF/ADMIN must use the admin panel.
 */
export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email richiesta." }, { status: 400 });
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return NextResponse.json({ error: "Password: minimo 6 caratteri." }, { status: 400 });
  }

  const result = await pool.query(
    `SELECT id, role FROM "user" WHERE email = $1 LIMIT 1`,
    [email],
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Account non trovato." }, { status: 404 });
  }

  const user = result.rows[0];

  // STAFF/ADMIN cannot set password via this endpoint
  if (user.role !== "CUSTOMER") {
    return NextResponse.json(
      { error: "Gli account STAFF e ADMIN gestiscono la password dal pannello di sicurezza." },
      { status: 403 },
    );
  }

  const hash = await bcrypt.hash(password, 12);

  await pool.query(
    `UPDATE "user" SET password_hash = $1 WHERE id = $2`,
    [hash, user.id],
  );

  return NextResponse.json({ success: true });
}
