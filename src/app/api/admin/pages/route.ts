import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorize } from "@/lib/auth-helpers";

// ─── GET /api/admin/pages ─────────────────────────────────────────
export async function GET() {
  await authorize("ADMIN");
  const result = await pool.query(
    `SELECT id, title, slug, excerpt, published, show_in_footer, show_in_nav,
            nav_order, footer_order, created_at, updated_at
     FROM "page" ORDER BY title ASC`,
  );
  return NextResponse.json(result.rows);
}

// ─── POST /api/admin/pages ────────────────────────────────────────
export async function POST(request: Request) {
  await authorize("ADMIN");
  const body = await request.json();
  const { title, slug, content, excerpt, published, showInFooter, showInNav, navOrder, footerOrder } = body;

  if (!title || !slug) {
    return NextResponse.json({ error: "Titolo e slug richiesti." }, { status: 400 });
  }

  const result = await pool.query(
    `INSERT INTO "page" (title, slug, content, excerpt, published, show_in_footer, show_in_nav, nav_order, footer_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [title, slug, content || "", excerpt || null, published ?? true,
     showInFooter ?? false, showInNav ?? false, navOrder ?? 0, footerOrder ?? 0],
  );

  return NextResponse.json({ success: true, id: result.rows[0].id });
}
