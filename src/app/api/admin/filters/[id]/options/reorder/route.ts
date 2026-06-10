import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorize } from "@/lib/auth-helpers";

// PATCH /api/admin/filters/[id]/options/reorder
// Body: { order: ["optionId1", "optionId2", ...] }
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }
  try {
    const { order } = await request.json();
    if (!Array.isArray(order)) {
      return NextResponse.json({ error: "order array required" }, { status: 400 });
    }

    // Check filter is not system
    const { id } = await params;
    const filterCheck = await pool.query(`SELECT is_system FROM "filter" WHERE id = $1`, [id]);
    if (filterCheck.rows[0]?.is_system) {
      return NextResponse.json({ error: "Impossibile riordinare: filtro di sistema." }, { status: 403 });
    }

    // Update sort_order for each option
    for (let i = 0; i < order.length; i++) {
      await pool.query(
        `UPDATE "filter_option" SET sort_order = $1 WHERE id = $2 AND filter_id = $3`,
        [i + 1, order[i], id]
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}
