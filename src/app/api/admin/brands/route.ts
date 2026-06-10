import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorize } from "@/lib/auth-helpers";

// GET /api/admin/brands — list all brands with product count
export async function GET() {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }
  try {
    const result = await pool.query(`
      SELECT b.*, COUNT(p.id)::int as "productCount"
      FROM "brand" b
      LEFT JOIN "product" p ON p.brand_id = b.id
      GROUP BY b.id ORDER BY b.name ASC
    `);
    return NextResponse.json(result.rows);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}

// POST /api/admin/brands — create a new brand
export async function POST(request: NextRequest) {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }
  try {
    const { name, slug, logo, description, website, showInHome, showInFooter } = await request.json();
    if (!name || !slug) {
      return NextResponse.json({ error: "name e slug sono obbligatori." }, { status: 400 });
    }
    const result = await pool.query(
      `INSERT INTO "brand" (name, slug, logo, description, website, show_in_home, show_in_footer)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, slug, logo || null, description || null, website || null, showInHome || false, showInFooter || false]
    );
    return NextResponse.json({ success: true, brand: result.rows[0] });
  } catch (e: unknown) {
    const pgErr = e as { code?: string };
    if (pgErr?.code === "23505") {
      return NextResponse.json({ error: "Slug già esistente." }, { status: 409 });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "Errore." }, { status: 500 });
  }
}
