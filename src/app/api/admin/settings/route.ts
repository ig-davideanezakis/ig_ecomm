import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorize } from "@/lib/auth-helpers";

// ─── GET /api/admin/settings ─────────────────────────────────────
export async function GET() {
  await authorize("ADMIN");
  const result = await pool.query(`SELECT key, value FROM store_setting ORDER BY key`);
  const settings: Record<string, string> = {};
  for (const row of result.rows) {
    settings[row.key] = row.value;
  }
  return NextResponse.json(settings);
}

// ─── PUT /api/admin/settings ─────────────────────────────────────
export async function PUT(request: Request) {
  await authorize("ADMIN");
  const body = await request.json();

  for (const [key, value] of Object.entries(body)) {
    if (typeof key === "string" && typeof value === "string") {
      await pool.query(
        `INSERT INTO store_setting (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [key, value],
      );
    }
  }

  return NextResponse.json({ success: true });
}
