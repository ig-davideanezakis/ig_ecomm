import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorize } from "@/lib/auth-helpers";

// PUT /api/admin/filters/[id]/options/[optionId]
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; optionId: string }> }) {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }
  const { optionId } = await params;
  try {
    const { value, label, slug, color, sortOrder } = await request.json();
    const result = await pool.query(
      `UPDATE "filter_option" SET value = COALESCE($1, value), label = COALESCE($2, label),
       slug = COALESCE($3, slug), color = COALESCE($4, color),
       sort_order = COALESCE($5, sort_order) WHERE id = $6 RETURNING *`,
      [value, label, slug, color, sortOrder, optionId]
    );
    return NextResponse.json({ success: true, option: result.rows[0] });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}

// DELETE /api/admin/filters/[id]/options/[optionId]
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; optionId: string }> }) {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }
  const { optionId } = await params;
  try {
    await pool.query(`DELETE FROM "filter_option" WHERE id = $1`, [optionId]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}
