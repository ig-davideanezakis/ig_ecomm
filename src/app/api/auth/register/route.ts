import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

/**
 * POST /api/auth/register
 * Creates a new CUSTOMER account with just an email (no password).
 * The user sets a password on first login.
 * STAFF/ADMIN roles cannot be created here — only via DB.
 */
export async function POST(request: Request) {
  const { email } = await request.json();

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Email valida richiesta." }, { status: 400 });
  }

  // Check if email already exists
  const existing = await pool.query(
    `SELECT id, role, password_hash FROM "user" WHERE email = $1 LIMIT 1`,
    [email],
  );
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: "Email già registrata." }, { status: 409 });
  }

  const result = await pool.query(
    `INSERT INTO "user" (email, role) VALUES ($1, 'CUSTOMER')
     RETURNING id, email, role`,
    [email],
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
