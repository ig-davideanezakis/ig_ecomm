import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorize } from "@/lib/auth-helpers";
import { generateProductSeo, generateCategorySeo } from "@/lib/seo-generator";

/**
 * POST /api/admin/seo/generate
 * Auto-generates SEO fields (meta title, meta description) for a product or category.
 *
 * Body: { type: "product" | "category", id: string }
 * Response: { seoTitle, seoDescription }
 */
export async function POST(request: Request) {
  try { await authorize("ADMIN"); } catch {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  try {
    const { type, id } = await request.json();

    if (type === "product") {
      const result = await pool.query(
        `SELECT p.title, p.description, c.name as category
         FROM "product" p
         LEFT JOIN "category" c ON p."category_id" = c.id
         WHERE p.id = $1 LIMIT 1`,
        [id],
      );
      if (result.rows.length === 0) {
        return NextResponse.json({ error: "Prodotto non trovato." }, { status: 404 });
      }
      const { title, description, category } = result.rows[0];
      return NextResponse.json(generateProductSeo(title, description, category));
    }

    if (type === "category") {
      const result = await pool.query(
        `SELECT c.name, c.description, p.name as parent
         FROM "category" c
         LEFT JOIN "category" p ON c.parent_id = p.id
         WHERE c.id = $1 LIMIT 1`,
        [id],
      );
      if (result.rows.length === 0) {
        return NextResponse.json({ error: "Categoria non trovata." }, { status: 404 });
      }
      const { name, description, parent } = result.rows[0];
      return NextResponse.json(generateCategorySeo(name, description, parent));
    }

    return NextResponse.json({ error: 'Tipo non valido. Usa "product" o "category".' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}
