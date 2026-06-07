import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorize } from "@/lib/auth-helpers";

// ─── GET /api/admin/pages/[id] ────────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await authorize("ADMIN");
  const { id } = await params;
  const result = await pool.query(
    `SELECT id, title, slug, content, excerpt, published,
            show_in_footer, show_in_nav, nav_order, footer_order
     FROM "page" WHERE id = $1 LIMIT 1`,
    [id],
  );
  if (result.rows.length === 0) return NextResponse.json({ error: "Pagina non trovata." }, { status: 404 });
  return NextResponse.json(result.rows[0]);
}

// ─── PUT /api/admin/pages/[id] ────────────────────────────────────
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await authorize("ADMIN");
  const { id } = await params;
  const body = await request.json();
  const { title, slug, content, excerpt, published, showInFooter, showInNav, navOrder, footerOrder } = body;

  await pool.query(
    `UPDATE "page" SET title=$1, slug=$2, content=$3, excerpt=$4, published=$5,
      show_in_footer=$6, show_in_nav=$7, nav_order=$8, footer_order=$9, updated_at=NOW()
     WHERE id=$10`,
    [title, slug, content || "", excerpt || null, published ?? true,
     showInFooter ?? false, showInNav ?? false, navOrder ?? 0, footerOrder ?? 0, id],
  );

  return NextResponse.json({ success: true });
}

// ─── DELETE /api/admin/pages/[id] ─────────────────────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await authorize("ADMIN");
  const { id } = await params;
  await pool.query(`DELETE FROM "page" WHERE id = $1`, [id]);
  return NextResponse.json({ success: true });
}
