import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorize } from "@/lib/auth-helpers";

// GET /api/admin/brands/[slug]
export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }
  const { slug } = await params;
  try {
    const result = await pool.query(`SELECT * FROM "brand" WHERE slug = $1 OR id = $1`, [slug]);
    if (result.rows.length === 0) return NextResponse.json({ error: "Brand non trovato." }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}

// PUT /api/admin/brands/[slug]
export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }
  const { slug } = await params;
  try {
    const { name, newSlug, logo, description, website, showInHome, showInFooter } = await request.json();
    const result = await pool.query(
      `UPDATE "brand" SET name = COALESCE($1, name), slug = COALESCE($2, slug),
       logo = COALESCE($3, logo), description = COALESCE($4, description),
       website = COALESCE($5, website),
       show_in_home = COALESCE($6, show_in_home),
       show_in_footer = COALESCE($7, show_in_footer),
       updated_at = NOW()
       WHERE slug = $8 OR id = $8 RETURNING *`,
      [name, newSlug, logo, description, website, showInHome, showInFooter, slug]
    );
    if (result.rows.length === 0) return NextResponse.json({ error: "Brand non trovato." }, { status: 404 });
    return NextResponse.json({ success: true, brand: result.rows[0] });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}

// DELETE /api/admin/brands/[slug]
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }
  const { slug } = await params;
  try {
    // Unlink products first, then delete
    await pool.query(`UPDATE "product" SET brand_id = NULL WHERE brand_id = (SELECT id FROM "brand" WHERE slug = $1 OR id = $1)`, [slug]);
    const result = await pool.query(`DELETE FROM "brand" WHERE slug = $1 OR id = $1 RETURNING id`, [slug]);
    if (result.rows.length === 0) return NextResponse.json({ error: "Brand non trovato." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}
