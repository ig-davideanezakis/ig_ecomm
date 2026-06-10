import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorize } from "@/lib/auth-helpers";

// GET /api/admin/filters/[id]
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }
  const { id } = await params;
  try {
    const filter = await pool.query(
      `SELECT f.*,
        COALESCE(
          (SELECT jsonb_agg(jsonb_build_object(
            'id', fo.id, 'value', fo.value, 'label', fo.label,
            'slug', fo.slug, 'color', fo.color, 'sort_order', fo.sort_order
          ) ORDER BY fo.sort_order ASC)
          FROM "filter_option" fo WHERE fo.filter_id = f.id),
          '[]'::jsonb
        ) as options
       FROM "filter" f WHERE f.id = $1`, [id]
    );
    if (filter.rows.length === 0) {
      return NextResponse.json({ error: "Filtro non trovato." }, { status: 404 });
    }
    return NextResponse.json(filter.rows[0]);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}

// PUT /api/admin/filters/[id]
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }
  const { id } = await params;
  try {
    // Block editing system filters
    const existing = await pool.query(`SELECT is_system FROM "filter" WHERE id = $1`, [id]);
    if (existing.rows.length === 0) return NextResponse.json({ error: "Filtro non trovato." }, { status: 404 });
    if (existing.rows[0].is_system) return NextResponse.json({ error: "Impossibile modificare un filtro di sistema." }, { status: 403 });

    const { name, slug, type, isGlobal, sortOrder } = await request.json();
    const result = await pool.query(
      `UPDATE "filter" SET name = COALESCE($1, name), slug = COALESCE($2, slug),
       type = COALESCE($3, type), is_global = COALESCE($4, is_global),
       sort_order = COALESCE($5, sort_order), updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [name, slug, type, isGlobal, sortOrder, id]
    );
    return NextResponse.json({ success: true, filter: result.rows[0] });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}

// DELETE /api/admin/filters/[id]
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }
  const { id } = await params;
  try {
    // Block deleting system filters
    const existing = await pool.query(`SELECT is_system FROM "filter" WHERE id = $1`, [id]);
    if (existing.rows.length === 0) return NextResponse.json({ error: "Filtro non trovato." }, { status: 404 });
    if (existing.rows[0].is_system) return NextResponse.json({ error: "Impossibile eliminare un filtro di sistema." }, { status: 403 });

    await pool.query(`DELETE FROM "filter" WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}
