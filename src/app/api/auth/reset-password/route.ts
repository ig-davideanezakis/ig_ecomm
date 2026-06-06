import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import bcrypt from "bcryptjs";

/**
 * POST /api/auth/reset-password
 * Verifies the reset token from verification_token table,
 * updates the user's password, and deletes the token.
 *
 * Body: { token: string, email: string, password: string }
 */
export async function POST(request: Request) {
  const { token, email, password } = await request.json();

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token richiesto." }, { status: 400 });
  }
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email richiesta." }, { status: 400 });
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return NextResponse.json({ error: "Password: minimo 6 caratteri." }, { status: 400 });
  }

  // Verify token exists and is not expired
  const tokenResult = await pool.query(
    `SELECT identifier, expires FROM verification_token
     WHERE identifier = $1 AND token = $2 LIMIT 1`,
    [email, token],
  );

  if (tokenResult.rows.length === 0) {
    return NextResponse.json({ error: "Link non valido o già utilizzato." }, { status: 400 });
  }

  const tokenRow = tokenResult.rows[0];

  if (new Date(tokenRow.expires) < new Date()) {
    // Token expired — clean it up
    await pool.query(
      `DELETE FROM verification_token WHERE identifier = $1 AND token = $2`,
      [email, token],
    );
    return NextResponse.json({ error: "Link scaduto. Richiedi un nuovo reset." }, { status: 400 });
  }

  // Find user
  const userResult = await pool.query(
    `SELECT id FROM "user" WHERE email = $1 LIMIT 1`,
    [email],
  );

  if (userResult.rows.length === 0) {
    return NextResponse.json({ error: "Account non trovato." }, { status: 404 });
  }

  // Update password
  const hash = await bcrypt.hash(password, 12);
  await pool.query(
    `UPDATE "user" SET password_hash = $1 WHERE id = $2`,
    [hash, userResult.rows[0].id],
  );

  // Delete used token
  await pool.query(
    `DELETE FROM verification_token WHERE identifier = $1 AND token = $2`,
    [email, token],
  );

  return NextResponse.json({ success: true });
}
