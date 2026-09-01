import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorize } from "@/lib/auth-helpers";
import { productSchema, validateOrThrow } from "@/lib/validation";

// ─── GET /api/admin/products/[id] ─────────────────────────────────
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }

  const { id } = await params;
  try {
    const result = await pool.query(
      `SELECT p.id, p.identifier, p.title, p.slug, p.description, p.content, p.specifications,
        p."base_price"::float as "basePrice", p."compare_at_price"::float as "compareAtPrice",
        p."cost_price"::float as "costPrice", p.sku, p.barcode, p.weight::float,
        p."seo_title" as "seoTitle", p."seo_description" as "seoDescription",
        p.featured, p.published, p."created_at", p."updated_at",
        p."category_id" as "categoryId", p."brand_id" as "brandId",
        CASE WHEN c.id IS NOT NULL THEN jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug) ELSE NULL END as category,
        CASE WHEN b.id IS NOT NULL THEN jsonb_build_object('id', b.id, 'name', b.name, 'slug', b.slug) ELSE NULL END as brand,
        COALESCE((SELECT jsonb_agg(jsonb_build_object('id', img.id, 'url', img.url, 'alt', img.alt, 'sortOrder', img."sort_order") ORDER BY img."sort_order" ASC) FROM "product_image" img WHERE img."product_id" = p.id), '[]'::jsonb) as images,
        COALESCE((SELECT jsonb_agg(jsonb_build_object('id', v.id, 'name', v.name, 'sku', v.sku, 'price', v.price::float, 'stock', v.stock, 'lowStock', v."low_stock", 'image', v.image, 'sortOrder', v."sort_order") ORDER BY v."sort_order" ASC) FROM "product_variant" v WHERE v."product_id" = p.id), '[]'::jsonb) as variants
      FROM "product" p
      LEFT JOIN "category" c ON p."category_id" = c.id
      LEFT JOIN "brand" b ON p."brand_id" = b.id
      WHERE p.id = $1 LIMIT 1`, [id]);

    if (result.rows.length === 0) return NextResponse.json({ error: "Prodotto non trovato." }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}

// ─── PUT /api/admin/products/[id] ─────────────────────────────────
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }

  const { id } = await params;
  try {
    const body = await request.json();
    const data = await validateOrThrow(productSchema, body);

    const productSlug = data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "prodotto";

    await pool.query(
      `UPDATE "product" SET identifier=$1, title=$2, slug=$3, description=$4, content=$5, specifications=$6,
        base_price=$7, compare_at_price=$8, cost_price=$9, sku=$10, barcode=$11,
        weight=$12, seo_title=$13, seo_description=$14, published=$15, featured=$16,
        category_id=$17, brand_id=$18, updated_at=NOW()
       WHERE id=$19`,
      [data.identifier || `PROD-${Date.now().toString(36).toUpperCase()}`, data.title, productSlug,
        data.description, data.content, data.specifications, data.basePrice, data.compareAtPrice, data.costPrice,
        data.sku, data.barcode, data.weight, data.seoTitle, data.seoDescription,
        data.published, data.featured, data.categoryId, data.brandId, id]);

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Response) {
      const text = await err.text();
      return NextResponse.json(JSON.parse(text), { status: err.status });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}

// ─── DELETE /api/admin/products/[id] ──────────────────────────────
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }

  const { id } = await params;
  try {
    await pool.query(`DELETE FROM "product" WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}
