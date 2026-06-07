import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorize } from "@/lib/auth-helpers";
import { categorySchema } from "@/lib/schemas";
import { validateOrThrow } from "@/lib/validation";

// ─── GET /api/admin/categories ────────────────────────────────────
export async function GET() {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }

  const result = await pool.query(
    `SELECT c.id, c.name, c.slug, c.description, c.image, c.icon,
            c.parent_id, c.sort_order, c.seo_title, c.seo_description,
            c.noindex, c.is_active, c.active_from, c.active_until,
            c.created_at, c.updated_at,
            (SELECT COUNT(*)::int FROM "product" p WHERE p.category_id = c.id) as product_count
     FROM "category" c
     ORDER BY c.sort_order ASC, c.name ASC`,
  );

  // Build tree
  const cats = result.rows;
  const map = new Map<string, any>();
  const roots: any[] = [];

  for (const c of cats) {
    map.set(c.id, { ...c, children: [] });
  }
  for (const c of cats) {
    const node = map.get(c.id);
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id).children.push(node);
    } else {
      roots.push(node);
    }
  }

  return NextResponse.json({ tree: roots, flat: cats });
}

// ─── POST /api/admin/categories ───────────────────────────────────
export async function POST(request: Request) {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }

  try {
    const body = await request.json();
    const data = await validateOrThrow(categorySchema, body);

    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "categoria";

    const result = await pool.query(
      `INSERT INTO "category" (name, slug, description, image, icon, parent_id, sort_order,
        seo_title, seo_description, noindex, is_active, active_from, active_until)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [data.name, slug, data.description, data.image, data.icon, data.parentId, data.sortOrder,
       data.seoTitle, data.seoDescription, data.noindex, data.isActive, data.activeFrom, data.activeUntil],
    );

    return NextResponse.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    if (err instanceof Response) {
      const text = await err.text();
      return NextResponse.json(JSON.parse(text), { status: err.status });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}
