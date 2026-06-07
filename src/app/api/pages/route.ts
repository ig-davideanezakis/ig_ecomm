import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// ─── GET /api/pages ──────────────────────────────────────────────
// Public — returns published pages for navigation/footer.
export async function GET() {
  const result = await pool.query(
    `SELECT id, title, slug, excerpt, show_in_footer, show_in_nav, nav_order, footer_order
     FROM "page" WHERE published = true
     ORDER BY nav_order ASC, title ASC`,
  );
  return NextResponse.json(result.rows);
}

// ─── GET /api/pages?slug=xxx ─────────────────────────────────────
// Also handles single page lookup by slug via query param.
