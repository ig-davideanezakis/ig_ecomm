import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorize } from "@/lib/auth-helpers";
import { syncAutoFilterValues } from "@/lib/filter-values";

/**
 * PUT /api/admin/products/[id]/filter-values
 *
 * Sets, clears, or resets one filter's value for one product — the
 * per-product "Attributi & filtri" editor in the product form.
 *
 * Body: { filterId: string, value?: string | null, reset?: boolean }
 * - `reset: true` — "auto" filters only: drops any admin override and
 *   re-derives the value from the product's current specifications.
 * - `value` non-empty — sets it directly. For an "auto" filter this is
 *   recorded with isOverride = true, so a later re-derivation (e.g. a
 *   fresh Icecat import) never silently replaces the admin's correction.
 * - `value` empty/omitted (and not a reset) — clears the value entirely.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }
  const { id: productId } = await params;

  let body: { filterId?: string; value?: string | null; reset?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON richiesto." }, { status: 400 });
  }
  const { filterId, value, reset } = body;
  if (!filterId) return NextResponse.json({ error: "filterId richiesto." }, { status: 400 });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const filterResult = await client.query(`SELECT value_mode FROM "filter" WHERE id = $1`, [filterId]);
    if (filterResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Filtro non trovato." }, { status: 404 });
    }
    const valueMode = filterResult.rows[0].value_mode as string;

    if (reset && valueMode !== "auto") {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Il ricalcolo automatico è disponibile solo per i filtri automatici." },
        { status: 400 },
      );
    }

    await client.query(
      `DELETE FROM "product_filter_value" WHERE product_id = $1 AND filter_id = $2`,
      [productId, filterId],
    );

    if (reset) {
      const productResult = await client.query(`SELECT specifications FROM "product" WHERE id = $1`, [productId]);
      if (productResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Prodotto non trovato." }, { status: 404 });
      }
      await syncAutoFilterValues(client, productId, productResult.rows[0].specifications);
    } else {
      const trimmed = typeof value === "string" ? value.trim() : "";
      if (trimmed) {
        await client.query(
          `INSERT INTO "product_filter_value" (product_id, filter_id, value, is_override)
           VALUES ($1, $2, $3, $4)`,
          [productId, filterId, trimmed, valueMode === "auto"],
        );
      }
    }

    await client.query("COMMIT");
    return NextResponse.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  } finally {
    client.release();
  }
}
