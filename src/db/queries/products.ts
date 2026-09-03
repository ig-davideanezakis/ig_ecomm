import { pool } from "@/lib/db";

// ─── Types ────────────────────────────────────────────────────────

export interface ProductListItem {
  id: string;
  identifier: string;
  title: string;
  slug: string;
  description: string | null;
  /** Raw specs JSON (Icecat groups) — lets pages render spec chips on cards. */
  specifications: string | null;
  basePrice: number;
  compareAtPrice: number | null;
  featured: boolean;
  createdAt: Date | string;
  category: { id: string; name: string; slug: string } | null;
  brand: { id: string; name: string; slug: string } | null;
  images: Array<{ id: string; url: string; alt: string | null; sortOrder: number }>;
  variants: Array<{ id: string; name: string; price: number; stock: number }>;
}

export interface ProductDetail {
  id: string;
  identifier: string;
  title: string;
  slug: string;
  description: string | null;
  content: string | null;
  specifications: string | null;
  basePrice: number;
  compareAtPrice: number | null;
  costPrice: number | null;
  weight: number | null;
  sku: string | null;
  barcode: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  featured: boolean;
  category: { id: string; name: string; slug: string } | null;
  brand: { id: string; name: string; slug: string; logo: string | null } | null;
  images: Array<{ id: string; url: string; alt: string | null; sortOrder: number }>;
  variants: Array<{ id: string; name: string; sku: string | null; price: number; stock: number; lowStock: number; image: string | null; sortOrder: number }>;
}

export interface FilterOption {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface ProductListParams {
  search?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  page?: number;
  limit?: number;
}

// ─── Query: List products with filters ────────────────────────────

export async function getProductList(params: ProductListParams = {}) {
  const {
    search = "",
    category: categorySlug = "",
    brand: brandSlug = "",
    minPrice,
    maxPrice,
    sort = "newest",
    page = 1,
    limit = 12,
  } = params;

  const skip = (page - 1) * limit;

  // Build WHERE clause with parameterized SQL
  const conditions: string[] = ['p.published = true'];
  const queryParams: unknown[] = [];
  let paramIdx = 0;

  if (search) {
    paramIdx++;
    conditions.push(`(p.title ILIKE $${paramIdx} OR p.description ILIKE $${paramIdx} OR p.identifier ILIKE $${paramIdx})`);
    queryParams.push(`%${search}%`);
  }

  if (categorySlug) {
    paramIdx++;
    conditions.push(`c.slug = $${paramIdx}`);
    queryParams.push(categorySlug);
  }

  if (brandSlug) {
    paramIdx++;
    conditions.push(`b.slug = $${paramIdx}`);
    queryParams.push(brandSlug);
  }

  if (minPrice !== undefined) {
    paramIdx++;
    conditions.push(`p."base_price" >= $${paramIdx}`);
    queryParams.push(minPrice);
  }

  if (maxPrice !== undefined) {
    paramIdx++;
    conditions.push(`p."base_price" <= $${paramIdx}`);
    queryParams.push(maxPrice);
  }

  const whereClause = conditions.join(" AND ");

  const orderClause = sort === "price_asc" ? 'p."base_price" ASC'
    : sort === "price_desc" ? 'p."base_price" DESC'
    : sort === "name" ? "p.title ASC"
    : 'p."created_at" DESC';

  // Get total count
  const countSql = `SELECT COUNT(*)::int as total FROM "product" p
     LEFT JOIN "category" c ON p."category_id" = c.id
     LEFT JOIN "brand" b ON p."brand_id" = b.id
     WHERE ${whereClause}`;
  const countResult = await pool.query(countSql, queryParams);
  const total = countResult.rows[0]?.total ?? 0;

  // Get products
  const result = await pool.query(
    `SELECT
      p.id, p.identifier, p.title, p.slug, p.description, p.specifications,
      p."base_price"::float as "basePrice", p."compare_at_price"::float as "compareAtPrice",
      p.featured, p."created_at",
      CASE WHEN c.id IS NOT NULL THEN jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug) ELSE NULL END as category,
      CASE WHEN b.id IS NOT NULL THEN jsonb_build_object('id', b.id, 'name', b.name, 'slug', b.slug) ELSE NULL END as brand,
      COALESCE(
        (SELECT jsonb_agg(sub) FROM (
          SELECT jsonb_build_object('id', img.id, 'url', img.url, 'alt', img.alt, '"sort_order"', img."sort_order") as sub
          FROM "product_image" img WHERE img."product_id" = p.id
          ORDER BY img."sort_order" ASC LIMIT 1
        ) t2),
        '[]'::jsonb
      ) as images,
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('id', v.id, 'name', v.name, 'price', v.price::float, 'stock', v.stock) ORDER BY v."sort_order" ASC)
         FROM "product_variant" v WHERE v."product_id" = p.id),
        '[]'::jsonb
      ) as variants
    FROM "product" p
    LEFT JOIN "category" c ON p."category_id" = c.id
    LEFT JOIN "brand" b ON p."brand_id" = b.id
    WHERE ${whereClause}
    ORDER BY ${orderClause}
    LIMIT ${limit} OFFSET ${skip}`,
    queryParams,
  );

  // Get filters
  const [categoriesResult, brandsResult] = await Promise.all([
    pool.query(
      `SELECT c.id, c.name, c.slug, COUNT(p.id)::int as "productCount"
       FROM "category" c
       LEFT JOIN "product" p ON p."category_id" = c.id AND p.published = true
       GROUP BY c.id, c.name, c.slug ORDER BY c."sort_order" ASC`,
    ),
    pool.query(
      `SELECT b.id, b.name, b.slug, COUNT(p.id)::int as "productCount"
       FROM "brand" b
       LEFT JOIN "product" p ON p."brand_id" = b.id AND p.published = true
       GROUP BY b.id, b.name, b.slug ORDER BY b.name ASC`,
    ),
  ]);

  const parseJson = (val: unknown) => {
    if (!val) return null;
    return typeof val === "string" ? JSON.parse(val) : val;
  };

  const products_list = result.rows.map((row: Record<string, unknown>) => ({
    ...row,
    images: parseJson(row.images) ?? [],
    variants: parseJson(row.variants) ?? [],
    category: parseJson(row.category),
    brand: parseJson(row.brand),
  })) as unknown as ProductListItem[];

  return {
    products: products_list,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: skip + limit < total,
      hasPrevPage: page > 1,
    } as PaginationInfo,
    filters: {
      categories: categoriesResult.rows as FilterOption[],
      brands: brandsResult.rows as FilterOption[],
    },
  };
}

// ─── Query: Single product by slug ───────────────────────────────

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const result = await pool.query(
    `SELECT
      p.id, p.identifier, p.title, p.slug, p.description, p.content, p.specifications,
      p."base_price"::float as "basePrice", p."compare_at_price"::float as "compareAtPrice",
      p."cost_price"::float as "costPrice", p.weight::float, p.sku, p.barcode,
      p."seo_title", p."seo_description", p.featured, p."created_at", p."updated_at",
      CASE WHEN c.id IS NOT NULL THEN jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug) ELSE NULL END as category,
      CASE WHEN b.id IS NOT NULL THEN jsonb_build_object('id', b.id, 'name', b.name, 'slug', b.slug, 'logo', b.logo) ELSE NULL END as brand,
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('id', img.id, 'url', img.url, 'alt', img.alt, '"sort_order"', img."sort_order") ORDER BY img."sort_order" ASC)
         FROM "product_image" img WHERE img."product_id" = p.id),
        '[]'::jsonb
      ) as images,
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object(
          'id', v.id, 'name', v.name, 'sku', v.sku, 'price', v.price::float,
          'stock', v.stock, '"low_stock"', v."low_stock", 'image', v.image,
          '"sort_order"', v."sort_order"
        ) ORDER BY v."sort_order" ASC)
        FROM "product_variant" v WHERE v."product_id" = p.id),
        '[]'::jsonb
      ) as variants
    FROM "product" p
    LEFT JOIN "category" c ON p."category_id" = c.id
    LEFT JOIN "brand" b ON p."brand_id" = b.id
    WHERE p.slug = $1 AND p.published = true
    LIMIT 1`,
    [slug],
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  const parseJson = (val: unknown) => {
    if (!val) return null;
    return typeof val === "string" ? JSON.parse(val) : val;
  };

  return {
    ...row,
    images: parseJson(row.images) ?? [],
    variants: parseJson(row.variants) ?? [],
    category: parseJson(row.category),
    brand: parseJson(row.brand),
  } as ProductDetail;
}

// ─── Utility: Get filter options ─────────────────────────────────

export async function getFilterOptions() {
  const [categoriesResult, brandsResult] = await Promise.all([
    pool.query(
      `SELECT c.id, c.name, c.slug, COUNT(p.id)::int as "productCount"
       FROM "category" c
       LEFT JOIN "product" p ON p."category_id" = c.id AND p.published = true
       GROUP BY c.id, c.name, c.slug ORDER BY c."sort_order" ASC`,
    ),
    pool.query(
      `SELECT b.id, b.name, b.slug, COUNT(p.id)::int as "productCount"
       FROM "brand" b
       LEFT JOIN "product" p ON p."brand_id" = b.id AND p.published = true
       GROUP BY b.id, b.name, b.slug ORDER BY b.name ASC`,
    ),
  ]);

  return {
    categories: categoriesResult.rows as FilterOption[],
    brands: brandsResult.rows as FilterOption[],
  };
}
