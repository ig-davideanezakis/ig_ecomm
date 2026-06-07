import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// ─── GET /api/pages/[slug] ────────────────────────────────────────
// Public — returns a single published page by slug.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const result = await pool.query(
    `SELECT id, title, slug, content, excerpt, created_at, updated_at
     FROM "page" WHERE slug = $1 AND published = true LIMIT 1`,
    [slug],
  );
  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Pagina non trovata." }, { status: 404 });
  }
  return NextResponse.json(result.rows[0]);
}
