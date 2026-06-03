import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

/**
 * POST /api/auth/set-password
 * Sets or changes the password for the current ADMIN/STAFF user.
 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "STAFF") {
    return NextResponse.json(
      { error: "Solo amministratori e staff possono impostare una password." },
      { status: 403 },
    );
  }

  const { currentPassword, newPassword } = await request.json();

  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json(
      { error: "La password deve essere di almeno 8 caratteri." },
      { status: 400 },
    );
  }

  // Verify current password if changing
  if (currentPassword) {
    const result = await pool.query(
      `SELECT password_hash FROM "user" WHERE id = $1`,
      [session.user.id],
    );
    const existingHash = result.rows[0]?.password_hash;
    if (existingHash) {
      const valid = await bcrypt.compare(currentPassword, existingHash);
      if (!valid) {
        return NextResponse.json(
          { error: "Password attuale non corretta." },
          { status: 400 },
        );
      }
    }
  }

  const hash = await bcrypt.hash(newPassword, 12);

  await pool.query(
    `UPDATE "user" SET password_hash = $1 WHERE id = $2`,
    [hash, session.user.id],
  );

  return NextResponse.json({ success: true });
}
