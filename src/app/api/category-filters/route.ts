import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

// GET /api/category-filters?categorySlug=xxx
// Returns all filters for a category, with inheritance walked up the tree + global filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categorySlug = searchParams.get("categorySlug");

    let categoryId = null;

    if (categorySlug) {
      const cat = await pool.query(
        `SELECT id, parent_id FROM "category" WHERE slug = $1`, [categorySlug]
      );
      if (cat.rows.length > 0) {
        categoryId = cat.rows[0].id;
      }
    }

    // 1. Get all global filters (price, stock, brand are built-in + any isGlobal=true)
    const globalFilters = await pool.query(`
      SELECT f.id, f.name, f.slug, f.type, f.sort_order,
        COALESCE(
          (SELECT jsonb_agg(jsonb_build_object(
            'id', fo.id, 'value', fo.value, 'label', fo.label,
            'slug', fo.slug, 'color', fo.color
          ) ORDER BY fo.sort_order ASC)
          FROM "filter_option" fo WHERE fo.filter_id = f.id),
          '[]'::jsonb
        ) as options
      FROM "filter" f WHERE f.is_global = true
      ORDER BY f.sort_order ASC
    `);

    // 2. Get category-specific filters with inheritance
    const categoryFilters: Array<Record<string, unknown>> = [];

    if (categoryId) {
      // Walk up the category tree to collect inherited filters
      // Get the full ancestor chain
      const ancestors = await pool.query(`
        WITH RECURSIVE cat_tree AS (
          SELECT id, parent_id, name, slug, 0 AS depth
          FROM "category" WHERE id = $1
          UNION ALL
          SELECT c.id, c.parent_id, c.name, c.slug, ct.depth + 1
          FROM "category" c
          INNER JOIN cat_tree ct ON c.id = ct.parent_id
        )
        SELECT id, name, slug, depth FROM cat_tree ORDER BY depth ASC
      `, [categoryId]);

      const ancestorIds = ancestors.rows.map(a => a.id);

      // Get category_filter entries for all ancestors + current category
      // where inherit = true (or the filter is assigned directly to this category)
      const filtersResult = await pool.query(`
        SELECT cf.category_id, cf.filter_id, cf.inherit, cf.sort_order as cf_sort,
          f.name, f.slug, f.type, f.sort_order as f_sort,
          c.name as cat_name, c.slug as cat_slug,
          COALESCE(
            (SELECT jsonb_agg(jsonb_build_object(
              'id', fo.id, 'value', fo.value, 'label', fo.label,
              'slug', fo.slug, 'color', fo.color
            ) ORDER BY fo.sort_order ASC)
            FROM "filter_option" fo WHERE fo.filter_id = f.id),
            '[]'::jsonb
          ) as options
        FROM "category_filter" cf
        JOIN "filter" f ON f.id = cf.filter_id
        JOIN "category" c ON c.id = cf.category_id
        WHERE cf.category_id = ANY($1) AND cf.inherit = true
        ORDER BY cf.sort_order ASC, f.sort_order ASC
      `, [ancestorIds]);

      // Build the filter list with source info, avoid duplicates
      const seenFilterIds = new Set<string>();
      for (const row of filtersResult.rows) {
        if (seenFilterIds.has(row.filter_id)) continue;
        // Skip if already a global filter
        seenFilterIds.add(row.filter_id);

        const isDirect = row.category_id === categoryId;
        const inheritedFrom = isDirect ? null : {
          id: row.category_id,
          name: row.cat_name,
          slug: row.cat_slug,
        };

        (categoryFilters as Array<Record<string, unknown>>).push({
          id: row.filter_id,
          name: row.name,
          slug: row.slug,
          type: row.type,
          options: row.options,
          source: isDirect ? "direct" : "inherited",
          inheritedFrom,
        });
      }
    }

    // Merge: global filters + category-specific filters (no duplicates)
    const globalMap = new Map<string, Record<string, unknown>>();
    for (const gf of globalFilters.rows) {
      globalMap.set(gf.id, { ...gf, source: "global", inheritedFrom: null });
    }

    // Category filters override/add to globals
    for (const cf of categoryFilters) {
      globalMap.set(String(cf.id), cf);
    }

    return NextResponse.json({
      filters: Array.from(globalMap.values()),
      category: categorySlug ? (await pool.query(`SELECT id, name, slug FROM "category" WHERE slug = $1`, [categorySlug])).rows[0] || null : null,
    });
  } catch (err) {
    console.error("GET /api/category-filters error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}
