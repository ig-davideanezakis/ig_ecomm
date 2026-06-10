import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorize } from "@/lib/auth-helpers";

// GET /api/admin/filters — list all filters with options
export async function GET() {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }
  try {
    const filters = await pool.query(
      `SELECT f.*, 
        COALESCE(
          (SELECT jsonb_agg(jsonb_build_object(
            'id', fo.id, 'value', fo.value, 'label', fo.label,
            'slug', fo.slug, 'color', fo.color, 'sort_order', fo.sort_order
          ) ORDER BY fo.sort_order ASC)
          FROM "filter_option" fo WHERE fo.filter_id = f.id),
          '[]'::jsonb
        ) as options
       FROM "filter" f ORDER BY f.sort_order ASC, f.name ASC`
    );
    return NextResponse.json(filters.rows);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}

// POST /api/admin/filters — create a new filter
export async function POST(request: NextRequest) {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }
  try {
    const { name, slug, type, isGlobal, sortOrder } = await request.json();
    if (!name || !slug) {
      return NextResponse.json({ error: "name e slug sono obbligatori." }, { status: 400 });
    }
    const result = await pool.query(
      `INSERT INTO "filter" (name, slug, type, is_global, sort_order)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, slug, type || "checkbox", isGlobal || false, sortOrder || 0]
    );
    return NextResponse.json({ success: true, filter: result.rows[0] });
  } catch (err: any) {
    if (err?.code === "23505") return NextResponse.json({ error: "Slug già esistente." }, { status: 409 });
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}
