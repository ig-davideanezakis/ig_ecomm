import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorize } from "@/lib/auth-helpers";
import { pageSchema, validateOrThrow } from "@/lib/validation";

export async function GET() {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }
  try {
    const result = await pool.query(
      `SELECT id, title, slug, content, excerpt, published,
              show_in_footer, show_in_nav, nav_order, footer_order
       FROM "page" ORDER BY title ASC`);
    return NextResponse.json(result.rows);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }
  try {
    const body = await request.json();
    const data = await validateOrThrow(pageSchema, body);
    const result = await pool.query(
      `INSERT INTO "page" (title, slug, content, excerpt, published, show_in_footer, show_in_nav, nav_order, footer_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [data.title, data.slug, data.content, data.excerpt, data.published, data.showInFooter, data.showInNav, data.navOrder, data.footerOrder]);
    return NextResponse.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    if (err instanceof Response) {
      const text = await err.text();
      return NextResponse.json(JSON.parse(text), { status: err.status });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}
