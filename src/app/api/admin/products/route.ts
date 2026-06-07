import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorize } from "@/lib/auth-helpers";
import { productSchema, validateOrThrow } from "@/lib/validation";

// ─── GET /api/admin/products ─────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    await authorize("ADMIN");
  } catch {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const brand = searchParams.get("brand") || "";
  const status = searchParams.get("status") || "";
  const sort = searchParams.get("sort") || "newest";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));
  const skip = (page - 1) * limit;

  try {
    const conditions: string[] = [];
    const queryParams: unknown[] = [];
    let idx = 0;

    if (search) {
      idx++; conditions.push(`(p.title ILIKE $${idx} OR p.identifier ILIKE $${idx} OR p.sku ILIKE $${idx})`);
      queryParams.push(`%${search}%`);
    }
    if (category) { idx++; conditions.push(`c.slug = $${idx}`); queryParams.push(category); }
    if (brand) { idx++; conditions.push(`b.slug = $${idx}`); queryParams.push(brand); }
    if (status === "published") conditions.push("p.published = true");
    else if (status === "draft") conditions.push("p.published = false");

    const whereClause = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

    const orderClause = sort === "title" ? "p.title ASC"
      : sort === "price_asc" ? 'p."base_price" ASC'
      : sort === "price_desc" ? 'p."base_price" DESC'
      : 'p."created_at" DESC';

    const countResult = await pool.query(
      `SELECT COUNT(*)::int as total FROM "product" p
       LEFT JOIN "category" c ON p."category_id" = c.id
       LEFT JOIN "brand" b ON p."brand_id" = b.id ${whereClause}`, queryParams);
    const total = countResult.rows[0]?.total ?? 0;

    const result = await pool.query(
      `SELECT p.id, p.identifier, p.title, p.slug, p.description,
        p."base_price"::float as "basePrice", p."compare_at_price"::float as "compareAtPrice",
        p."cost_price"::float as "costPrice", p.sku, p.barcode,
        p.featured, p.published, p."created_at", p."updated_at",
        (SELECT COUNT(*)::int FROM product_variant WHERE product_id = p.id) as variant_count,
        (SELECT COALESCE(SUM(stock)::int, 0) FROM product_variant WHERE product_id = p.id) as total_stock,
        CASE WHEN c.id IS NOT NULL THEN jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug) ELSE NULL END as category,
        CASE WHEN b.id IS NOT NULL THEN jsonb_build_object('id', b.id, 'name', b.name, 'slug', b.slug) ELSE NULL END as brand
      FROM "product" p
      LEFT JOIN "category" c ON p."category_id" = c.id
      LEFT JOIN "brand" b ON p."brand_id" = b.id
      ${whereClause}
      ORDER BY ${orderClause}
      LIMIT $${idx + 1} OFFSET $${idx + 2}`, [...queryParams, limit, skip]);

    const [categories, brands] = await Promise.all([
      pool.query(`SELECT id, name, slug FROM "category" ORDER BY "sort_order" ASC`),
      pool.query(`SELECT id, name, slug FROM "brand" ORDER BY name ASC`),
    ]);

    return NextResponse.json({
      products: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      filters: { categories: categories.rows, brands: brands.rows },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Errore durante il caricamento dei prodotti.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── POST /api/admin/products ────────────────────────────────────
export async function POST(request: Request) {
  try {
    await authorize("ADMIN");
  } catch {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = await validateOrThrow(productSchema, body);

    const slug = (data.slug || data.title.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "prodotto")
      + "-" + Date.now().toString(36);

    const ident = data.identifier || `PROD-${Date.now().toString(36).toUpperCase()}`;

    const result = await pool.query(
      `INSERT INTO "product" (identifier, title, slug, description, content,
        base_price, compare_at_price, cost_price, sku, barcode, weight,
        seo_title, seo_description, published, featured, category_id, brand_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING id`,
      [ident, data.title, slug, data.description || null, data.content || null,
        data.basePrice, data.compareAtPrice, data.costPrice,
        data.sku, data.barcode, data.weight,
        data.seoTitle, data.seoDescription,
        data.published, data.featured,
        data.categoryId, data.brandId],
    );

    return NextResponse.json({ success: true, id: result.rows[0].id, slug });
  } catch (err) {
    if (err instanceof Response) {
      const text = await err.text();
      return NextResponse.json(JSON.parse(text), { status: err.status });
    }
    const msg = err instanceof Error ? err.message : "Errore durante la creazione del prodotto.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
