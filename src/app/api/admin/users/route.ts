import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

/**
 * GET /api/admin/users
 * Returns all users. ADMIN only.
 */
export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await pool.query(`
    SELECT
      id, name, email, role, phone, totp_enabled,
      "emailVerified",
      created_at, updated_at
    FROM "user"
    ORDER BY created_at DESC
  `);

  return NextResponse.json({ users: result.rows });
}

/**
 * POST /api/admin/users
 * Create a new user. ADMIN only.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, name, role } = await request.json();

  if (!email || !role) {
    return NextResponse.json(
      { error: "Email e ruolo sono obbligatori." },
      { status: 400 },
    );
  }

  const validRoles = ["CUSTOMER", "STAFF", "ADMIN"];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Ruolo non valido." }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `INSERT INTO "user" (email, name, role) VALUES ($1, $2, $3) RETURNING id, email, name, role, created_at`,
      [email, name || null, role],
    );
    return NextResponse.json({ user: result.rows[0] }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return NextResponse.json(
        { error: "Esiste già un utente con questa email." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Errore durante la creazione." }, { status: 500 });
  }
}
