import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorize } from "@/lib/auth-helpers";
import { z } from "zod";

const reorderSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    parentId: z.string().nullable(),
    sortOrder: z.number().int(),
  })),
});

// ─── PUT /api/admin/categories/reorder ────────────────────────────
export async function PUT(request: Request) {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }
  try {
    const body = await request.json();
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
    }

    for (const item of parsed.data.items) {
      await pool.query(
        `UPDATE category SET parent_id = $1, sort_order = $2 WHERE id = $3`,
        [item.parentId, item.sortOrder, item.id],
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}
