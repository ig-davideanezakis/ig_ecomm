import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import bcrypt from "bcryptjs";

/**
 * POST /api/auth/register
 * Creates a new CUSTOMER account with email and password in one step.
 * STAFF/ADMIN roles cannot be created here — only via DB.
 */
export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Email valida richiesta." }, { status: 400 });
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return NextResponse.json({ error: "Password: minimo 6 caratteri." }, { status: 400 });
  }

  // Check if email already exists
  const existing = await pool.query(
    `SELECT id FROM "user" WHERE email = $1 LIMIT 1`,
    [email],
  );
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: "Email già registrata." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await pool.query(
    `INSERT INTO "user" (email, role, password_hash) VALUES ($1, 'CUSTOMER', $2)
     RETURNING id, email, role`,
    [email, passwordHash],
  );

  const user = result.rows[0];

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });
}
