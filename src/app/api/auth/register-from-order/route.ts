import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import bcrypt from "bcryptjs";

/**
 * POST /api/auth/register-from-order
 * Creates a CUSTOMER account from order data (post-purchase registration).
 * Called from the Thank You page when user chooses "Salva i tuoi dati".
 *
 * Body: { email, password, name }
 */
export async function POST(request: Request) {
  const { email, password, name } = await request.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email richiesta." }, { status: 400 });
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return NextResponse.json({ error: "Password: minimo 6 caratteri." }, { status: 400 });
  }

  // Check if already registered
  const existing = await pool.query(
    `SELECT id FROM "user" WHERE email = $1 LIMIT 1`,
    [email],
  );

  if (existing.rows.length > 0) {
    // User already exists — just link past orders
    return NextResponse.json({ success: true, alreadyExists: true });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const userResult = await pool.query(
    `INSERT INTO "user" (email, name, role, password_hash) VALUES ($1, $2, 'CUSTOMER', $3)
     RETURNING id`,
    [email, name?.trim() || email.split("@")[0], passwordHash],
  );
  const userId = userResult.rows[0].id;

  // Link guest orders to the new account
  await pool.query(
    `UPDATE "order" SET user_id = $1 WHERE billing_email = $2 AND user_id IS NULL`,
    [userId, email],
  );

  return NextResponse.json({ success: true, userId });
}
