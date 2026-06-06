import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import bcrypt from "bcryptjs";

/**
 * POST /api/auth/register
 * Creates a new CUSTOMER account with email, name, and password.
 */
export async function POST(request: Request) {
  const { email, name, password } = await request.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email richiesta." }, { status: 400 });
  }
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Nome richiesto." }, { status: 400 });
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
    `INSERT INTO "user" (email, name, role, password_hash) VALUES ($1, $2, $3, $4)
     RETURNING id, email, name, role`,
    [email, name.trim(), "CUSTOMER", passwordHash],
  );

  const user = result.rows[0];

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
}
