import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

// GET /api/brands — public list of brands
// Query params: ?limit=N&location=home|footer
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 50));
    const location = searchParams.get("location");

    let whereClause = "";
    if (location === "home") {
      whereClause = "WHERE b.show_in_home = true";
    } else if (location === "footer") {
      whereClause = "WHERE b.show_in_footer = true";
    }

    const result = await pool.query(`
      SELECT b.id, b.name, b.slug, b.logo, b.description, b.website,
        COUNT(p.id)::int as "productCount"
      FROM "brand" b
      LEFT JOIN "product" p ON p.brand_id = b.id AND p.published = true
      ${whereClause}
      GROUP BY b.id HAVING COUNT(p.id) > 0
      ORDER BY b.name ASC
      LIMIT ${limit}
    `);
    return NextResponse.json(result.rows);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}
