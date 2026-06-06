import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

/**
 * POST /api/auth/check-email
 * Given an email, returns whether the user exists and their auth status.
 * The login page uses this to decide which form to show:
 *   - Not found → Registration (name + password)
 *   - Found, has password → Password form
 *   - Found, no password → Force password setup
 */
export async function POST(request: Request) {
  const { email } = await request.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email richiesta." }, { status: 400 });
  }

  const result = await pool.query(
    `SELECT id, email, name, role, password_hash, totp_enabled FROM "user" WHERE email = $1 LIMIT 1`,
    [email],
  );

  if (result.rows.length === 0) {
    return NextResponse.json({
      exists: false,
      role: null,
      totpEnabled: false,
      hasPassword: false,
    });
  }

  const user = result.rows[0];

  return NextResponse.json({
    exists: true,
    role: user.role,
    name: user.name,
    totpEnabled: user.totp_enabled,
    hasPassword: !!user.password_hash,
  });
}
