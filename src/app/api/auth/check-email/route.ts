import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

/**
 * POST /api/auth/check-email
 * Given an email, returns whether the user exists and their role.
 * The login page uses this to decide which auth flow to show:
 *   - Not found / CUSTOMER → Magic Link
 *   - STAFF / ADMIN → Password form
 */
export async function POST(request: Request) {
  const { email } = await request.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email richiesta." }, { status: 400 });
  }

  const result = await pool.query(
    `SELECT id, email, role, totp_enabled FROM "user" WHERE email = $1 LIMIT 1`,
    [email],
  );

  if (result.rows.length === 0) {
    return NextResponse.json({
      exists: false,
      role: null,
      totpEnabled: false,
    });
  }

  const user = result.rows[0];

  return NextResponse.json({
    exists: true,
    role: user.role,
    totpEnabled: user.totp_enabled,
    hasPassword: user.role === "STAFF" || user.role === "ADMIN",
  });
}
