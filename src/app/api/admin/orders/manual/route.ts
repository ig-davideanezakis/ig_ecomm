import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorize } from "@/lib/auth-helpers";

// POST /api/admin/orders/manual — create a store sale (paid, delivered)
export async function POST(request: NextRequest) {
  try { await authorize("ADMIN"); } catch { return NextResponse.json({ error: "Non autorizzato." }, { status: 401 }); }

  try {
    const { name, email, phone, items, paymentMethod, notes } = await request.json();

    if (!name || !items?.length) {
      return NextResponse.json({ error: "Nome e almeno un prodotto richiesti." }, { status: 400 });
    }

    // Calculate totals
    const subtotal = items.reduce((sum: number, i: { price: number; quantity: number }) => sum + i.price * i.quantity, 0);
    const total = subtotal; // No shipping for store sales
    const orderNumber = `NEG-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const now = new Date().toISOString();

    const orderResult = await pool.query(
      `INSERT INTO "order" (order_number, status, subtotal, shipping_cost, total,
        billing_name, billing_email, billing_phone,
        billing_address, billing_city, billing_zip, billing_country,
        shipping_name, shipping_address, shipping_city, shipping_zip,
        shipping_method, payment_method, payment_status, paid_at,
        notes, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
      RETURNING id, order_number`,
      [orderNumber, "DELIVERED", subtotal.toFixed(2), "0", total.toFixed(2),
        name, email || null, phone || null,
        "Negozio — Via...", "Palermo", "90100", "IT",
        name, "Negozio — Via...", "Palermo", "90100",
        "ritiro", paymentMethod || "contanti", "PAID", now,
        notes || null, now, now]
    );

    const order = orderResult.rows[0];

    // Insert items + deduct stock
    for (const item of items) {
      await pool.query(
        `INSERT INTO order_item (quantity, unit_price, total_price, order_id, product_id, variant_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [item.quantity, item.price.toFixed(2), (item.price * item.quantity).toFixed(2), order.id, item.productId, item.variantId]
      );
      if (item.variantId) {
        await pool.query(
          `UPDATE product_variant SET stock = GREATEST(0, stock - $1) WHERE id = $2`,
          [item.quantity, item.variantId]
        );
      }
    }

    return NextResponse.json({
      success: true,
      order: { id: order.id, orderNumber: order.order_number, total: total.toFixed(2) },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}
