import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { auth } from "@/lib/auth";
import { checkoutSchema, validateOrThrow } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await validateOrThrow(checkoutSchema, body);

    const session = await auth();
    const userId = session?.user?.id ?? null;

    const subtotal = data.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const shippingCost = subtotal >= 150 ? 0 : 9.90;
    const total = subtotal + shippingCost;
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const orderResult = await pool.query(
      `INSERT INTO "order" (order_number, status, subtotal, shipping_cost, total,
        billing_name, billing_email, billing_phone,
        billing_address, billing_city, billing_province, billing_zip, billing_country,
        shipping_name, shipping_email, shipping_phone,
        shipping_address, shipping_city, shipping_province, shipping_zip, shipping_country,
        shipping_method, payment_method, payment_status, user_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
      RETURNING id, order_number`,
      [orderNumber, "PENDING", subtotal.toFixed(2), shippingCost.toFixed(2), total.toFixed(2),
        data.name, data.email, data.phone || null,
        data.address, data.city, data.province || null, data.zip, data.country,
        data.name, data.email, data.phone || null,
        data.address, data.city, data.province || null, data.zip, data.country,
        data.shippingMethod, data.paymentMethod, "PENDING", userId]);

    const order = orderResult.rows[0];

    for (const item of data.items) {
      await pool.query(
        `INSERT INTO order_item (quantity, unit_price, total_price, order_id, product_id, variant_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [item.quantity, item.price.toFixed(2), (item.price * item.quantity).toFixed(2), order.id, item.productId, item.variantId]);
      await pool.query(`UPDATE product_variant SET stock = stock - $1 WHERE id = $2 AND stock >= $1`,
        [item.quantity, item.variantId]);
    }

    if (data.newsletterConsent) {
      await pool.query(`INSERT INTO newsletter_subscriber (email) VALUES ($1) ON CONFLICT (email) DO NOTHING`, [data.email]);
    }

    return NextResponse.json({ success: true, order: { id: order.id, orderNumber: order.order_number, total: total.toFixed(2) } });
  } catch (err) {
    if (err instanceof Response) {
      const text = await err.text();
      return NextResponse.json(JSON.parse(text), { status: err.status });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore durante il checkout." }, { status: 500 });
  }
}
