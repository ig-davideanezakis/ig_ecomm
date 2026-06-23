import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorize } from "@/lib/auth-helpers";

// GET /api/admin/orders/[id] — full order detail
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }
  const { id } = await params;
  try {
    const order = await pool.query(`
      SELECT o.*, o.total::float, o.subtotal::float, o.shipping_cost::float, o.discount::float,
        u.name as user_name, u.email as user_email
      FROM "order" o
      LEFT JOIN "user" u ON u.id = o.user_id
      WHERE o.id = $1
    `, [id]);

    if (order.rows.length === 0) return NextResponse.json({ error: "Ordine non trovato." }, { status: 404 });

    const items = await pool.query(`
      SELECT oi.*, oi.unit_price::float, oi.total_price::float,
        p.title as product_title, p.slug as product_slug,
        pv.name as variant_name, pv.sku as variant_sku,
        (SELECT url FROM product_image pi WHERE pi.product_id = p.id ORDER BY pi.sort_order ASC LIMIT 1) as image_url
      FROM order_item oi
      LEFT JOIN product p ON p.id = oi.product_id
      LEFT JOIN product_variant pv ON pv.id = oi.variant_id
      WHERE oi.order_id = $1 ORDER BY oi.id ASC
    `, [id]);

    const statusHistory = await pool.query(`
      SELECT * FROM order_status_log WHERE order_id = $1 ORDER BY created_at ASC
    `, [id]).catch(() => ({ rows: [] })); // table may not exist yet

    return NextResponse.json({
      ...order.rows[0],
      items: items.rows,
      statusHistory: statusHistory.rows,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}

// PUT /api/admin/orders/[id] — update order fields (tracking, notes, payment)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }
  const { id } = await params;
  try {
    const { trackingNumber, trackingUrl, notes, paymentStatus, paymentId, paymentMethod } = await request.json();
    const updates: string[] = [];
    const vals: unknown[] = [];
    let idx = 0;

    if (trackingNumber !== undefined) { idx++; updates.push(`tracking_number = $${idx}`); vals.push(trackingNumber); }
    if (trackingUrl !== undefined) { idx++; updates.push(`tracking_url = $${idx}`); vals.push(trackingUrl); }
    if (notes !== undefined) { idx++; updates.push(`notes = $${idx}`); vals.push(notes); }
    if (paymentStatus !== undefined) {
      idx++; updates.push(`payment_status = $${idx}`); vals.push(paymentStatus);
      if (paymentStatus === "PAID") { idx++; updates.push(`paid_at = $${idx}`); vals.push(new Date().toISOString()); }
    }
    if (paymentId !== undefined) { idx++; updates.push(`payment_id = $${idx}`); vals.push(paymentId); }
    if (paymentMethod !== undefined) { idx++; updates.push(`payment_method = $${idx}`); vals.push(paymentMethod); }

    if (updates.length === 0) return NextResponse.json({ error: "Nessun campo da aggiornare." }, { status: 400 });
    idx++; updates.push(`updated_at = $${idx}`); vals.push(new Date().toISOString());
    vals.push(id);

    await pool.query(`UPDATE "order" SET ${updates.join(", ")} WHERE id = $${idx + 1}`, vals);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}
