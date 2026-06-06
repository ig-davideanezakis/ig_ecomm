import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import bcrypt from "bcryptjs";

/**
 * POST /api/auth/set-password-by-email
 * Resets the password for any user identified by email.
 * Available to all roles (CUSTOMER, STAFF, ADMIN).
 * The user must already exist in the database.
 *
 * Security note (MVP): this allows password reset by knowing the email.
 * In production, add email-based token verification.
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
    `SELECT id FROM "user" WHERE email = $1 LIMIT 1`,
    [email],
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Account non trovato." }, { status: 404 });
  }

  const hash = await bcrypt.hash(password, 12);

  await pool.query(
    `UPDATE "user" SET password_hash = $1 WHERE id = $2`,
    [hash, result.rows[0].id],
  );

  return NextResponse.json({ success: true });
}
