import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// ─── GET /api/settings ────────────────────────────────────────────
// Public endpoint — no auth required. Returns all store settings.
export async function GET() {
  const result = await pool.query(`SELECT key, value FROM store_setting`);
  const settings: Record<string, string> = {};
  for (const row of result.rows) {
    settings[row.key] = row.value;
  }
  return NextResponse.json(settings);
}
