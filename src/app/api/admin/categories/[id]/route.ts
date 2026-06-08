import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorize } from "@/lib/auth-helpers";
import { categorySchema, type CategoryInput } from "@/lib/schemas";
import { validateOrThrow } from "@/lib/validation";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }
  const { id } = await params;

  const result = await pool.query(
    `SELECT id, name, slug, description, image, icon, parent_id, sort_order,
            seo_title, seo_description, noindex, is_active, active_from, active_until
     FROM "category" WHERE id = $1 LIMIT 1`,
    [id],
  );
  if (result.rows.length === 0) return NextResponse.json({ error: "Categoria non trovata." }, { status: 404 });
  return NextResponse.json(result.rows[0]);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }
  const { id } = await params;

  try {
    const body = await request.json();

    if (body._reorder) {
      await pool.query(`UPDATE "category" SET parent_id=$1, sort_order=$2, updated_at=NOW() WHERE id=$3`,
        [body.parentId || null, body.sortOrder ?? 0, id]);
      return NextResponse.json({ success: true });
    }

    const data: CategoryInput = await validateOrThrow(categorySchema, body);
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    await pool.query(
      `UPDATE "category" SET name=$1, slug=$2, description=$3, image=$4, icon=$5,
        parent_id=$6, sort_order=$7, seo_title=$8, seo_description=$9,
        noindex=$10, is_active=$11, active_from=$12, active_until=$13, updated_at=NOW()
       WHERE id=$14`,
      [data.name, slug, data.description, data.image, data.icon, data.parentId, data.sortOrder,
       data.seoTitle, data.seoDescription, data.noindex, data.isActive, data.activeFrom, data.activeUntil, id],
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Response) {
      const text = await err.text();
      return NextResponse.json(JSON.parse(text), { status: err.status });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }
  const { id } = await params;

  const cat = await pool.query(`SELECT parent_id FROM "category" WHERE id = $1 LIMIT 1`, [id]);
  if (cat.rows.length > 0) {
    const parentId = cat.rows[0].parent_id;
    await pool.query(`UPDATE "category" SET parent_id = $1 WHERE parent_id = $2`, [parentId, id]);
  }

  await pool.query(`DELETE FROM "category" WHERE id = $1`, [id]);
  return NextResponse.json({ success: true });
}
