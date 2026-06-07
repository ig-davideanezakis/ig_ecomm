import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorize } from "@/lib/auth-helpers";

// ─── GET /api/admin/categories/[id]/filters ───────────────────────
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }
  const { id } = await params;
  try {
    const result = await pool.query(
      `SELECT f.id, f.filter_key, f.filter_label, f.sort_order
       FROM category_filter f WHERE f.category_id = $1 ORDER BY f.sort_order ASC`, [id]);
    return NextResponse.json(result.rows);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}

// ─── POST /api/admin/categories/[id]/filters ──────────────────────
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }
  const { id } = await params;
  try {
    const { filterKey, filterLabel } = await request.json();
    if (!filterKey) return NextResponse.json({ error: "filterKey richiesto." }, { status: 400 });

    const result = await pool.query(
      `INSERT INTO category_filter (category_id, filter_key, filter_label)
       VALUES ($1, $2, $3) RETURNING id, filter_key, filter_label, sort_order`,
      [id, filterKey, filterLabel || filterKey]);
    return NextResponse.json({ success: true, filter: result.rows[0] });
  } catch (err) {
    if ((err as any)?.code === '23505') return NextResponse.json({ error: "Filtro già presente." }, { status: 409 });
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}

// ─── DELETE /api/admin/categories/[id]/filters ────────────────────
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const filterId = searchParams.get("filterId");
  try {
    await pool.query(`DELETE FROM category_filter WHERE id = $1 AND category_id = $2`, [filterId, id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}
