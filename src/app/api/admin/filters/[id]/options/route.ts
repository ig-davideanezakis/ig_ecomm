import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorize } from "@/lib/auth-helpers";

// GET /api/admin/filters/[id]/options
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }
  const { id } = await params;
  try {
    const result = await pool.query(
      `SELECT * FROM "filter_option" WHERE filter_id = $1 ORDER BY sort_order ASC`, [id]
    );
    return NextResponse.json(result.rows);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}

// POST /api/admin/filters/[id]/options
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }
  const { id } = await params;
  try {
    const { value, label, slug, color, sortOrder } = await request.json();
    if (!value) return NextResponse.json({ error: "value è obbligatorio." }, { status: 400 });
    const result = await pool.query(
      `INSERT INTO "filter_option" (value, label, slug, color, sort_order, filter_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [value, label || null, slug || null, color || null, sortOrder || 0, id]
    );
    return NextResponse.json({ success: true, option: result.rows[0] });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}
