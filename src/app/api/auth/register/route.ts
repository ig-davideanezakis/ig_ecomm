import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import bcrypt from "bcryptjs";
import { registerSchema, validateOrThrow } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = await validateOrThrow(registerSchema, body);

    const existing = await pool.query(`SELECT id FROM "user" WHERE email = $1 LIMIT 1`, [email]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "Email già registrata." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO "user" (email, role, password_hash) VALUES ($1, 'CUSTOMER', $2) RETURNING id, email, role`,
      [email, passwordHash],
    );

    return NextResponse.json({ success: true, user: result.rows[0] });
  } catch (err) {
    if (err instanceof Response) {
      const text = await err.text();
      return NextResponse.json(JSON.parse(text), { status: err.status });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}
