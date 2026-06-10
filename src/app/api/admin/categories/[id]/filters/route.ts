import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorize } from "@/lib/auth-helpers";

// GET /api/admin/categories/[id]/filters — global + inherited + direct
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }
  const { id } = await params;
  try {
    const globalRes = await pool.query(`
      SELECT f.id as filter_id, f.name as filter_name, f.slug as filter_slug,
        f.type as filter_type, NULL::varchar as category_id, NULL::varchar as category_name,
        true as inherit, 'global' as source,
        COALESCE((SELECT jsonb_agg(jsonb_build_object('id', fo.id, 'value', fo.value, 'label', fo.label) ORDER BY fo.sort_order ASC)
          FROM "filter_option" fo WHERE fo.filter_id = f.id), '[]'::jsonb) as options
      FROM "filter" f WHERE f.is_global = true
    `);

    const inheritedRes = await pool.query(`
      WITH RECURSIVE cat_tree AS (
        SELECT id, parent_id FROM "category" WHERE id = $1
        UNION ALL
        SELECT c.id, c.parent_id FROM "category" c
        INNER JOIN cat_tree ct ON c.id = ct.parent_id
      )
      SELECT f.id as filter_id, f.name as filter_name, f.slug as filter_slug,
        f.type as filter_type, cf.category_id, c.name as category_name,
        cf.inherit, 'inherited' as source,
        COALESCE((SELECT jsonb_agg(jsonb_build_object('id', fo.id, 'value', fo.value, 'label', fo.label) ORDER BY fo.sort_order ASC)
          FROM "filter_option" fo WHERE fo.filter_id = f.id), '[]'::jsonb) as options
      FROM cat_tree ct
      JOIN "category_filter" cf ON cf.category_id = ct.parent_id AND cf.inherit = true AND ct.parent_id IS NOT NULL
      JOIN "filter" f ON f.id = cf.filter_id
      JOIN "category" c ON c.id = cf.category_id
    `, [id]);

    const directRes = await pool.query(`
      SELECT f.id as filter_id, f.name as filter_name, f.slug as filter_slug,
        f.type as filter_type, cf.category_id, c.name as category_name,
        cf.inherit, 'direct' as source,
        COALESCE((SELECT jsonb_agg(jsonb_build_object('id', fo.id, 'value', fo.value, 'label', fo.label) ORDER BY fo.sort_order ASC)
          FROM "filter_option" fo WHERE fo.filter_id = f.id), '[]'::jsonb) as options
      FROM "category_filter" cf
      JOIN "filter" f ON f.id = cf.filter_id
      JOIN "category" c ON c.id = cf.category_id
      WHERE cf.category_id = $1 AND f.is_global = false
    `, [id]);

    const seen = new Set<string>();
    const all: any[] = [];
    for (const row of [...globalRes.rows, ...inheritedRes.rows, ...directRes.rows]) {
      if (seen.has(row.filter_id)) continue;
      seen.add(row.filter_id);
      all.push(row);
    }
    return NextResponse.json(all);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}

// POST /api/admin/categories/[id]/filters — assign a filter to this category
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }
  const { id } = await params;
  try {
    const { filterId } = await request.json();
    if (!filterId) return NextResponse.json({ error: "filterId richiesto." }, { status: 400 });
    await pool.query(
      `INSERT INTO "category_filter" (category_id, filter_id) VALUES ($1, $2) ON CONFLICT (category_id, filter_id) DO NOTHING`,
      [id, filterId]
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}

// PUT /api/admin/categories/[id]/filters — update inherit flag
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }
  const { id } = await params;
  try {
    const { filterId, inherit } = await request.json();
    await pool.query(
      `UPDATE "category_filter" SET inherit = $1 WHERE category_id = $2 AND filter_id = $3`,
      [inherit, id, filterId]
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}

// DELETE /api/admin/categories/[id]/filters — remove a filter
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const filterId = searchParams.get("filterId");
  try {
    await pool.query(`DELETE FROM "category_filter" WHERE category_id = $1 AND filter_id = $2`, [id, filterId]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}
