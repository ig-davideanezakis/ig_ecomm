import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// GET /api/brands — public list of brands with product count
export async function GET() {
  try {
    const result = await pool.query(`
      SELECT b.id, b.name, b.slug, b.logo, b.description, b.website,
        COUNT(p.id)::int as "productCount"
      FROM "brand" b
      LEFT JOIN "product" p ON p.brand_id = b.id AND p.published = true
      GROUP BY b.id HAVING COUNT(p.id) > 0
      ORDER BY b.name ASC
    `);
    return NextResponse.json(result.rows);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}
