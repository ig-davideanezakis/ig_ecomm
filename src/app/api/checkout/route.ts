import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { auth } from "@/lib/auth";
import { checkoutSchema, validateOrThrow } from "@/lib/validation";

export async function POST(request: Request) {
  let data;
  try {
    const body = await request.json();
    data = await validateOrThrow(checkoutSchema, body);
  } catch (err) {
    if (err instanceof Response) {
      const text = await err.text();
      return NextResponse.json(JSON.parse(text), { status: err.status });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Dati non validi." }, { status: 400 });
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Never trust client-supplied prices — look up the real price and lock the
    // stock row so concurrent checkouts of the same variant serialize correctly.
    const items: { productId: string; variantId: string; quantity: number; price: number }[] = [];
    for (const item of data.items) {
      const variantResult = await client.query(
        `SELECT price, stock FROM product_variant WHERE id = $1 AND product_id = $2 FOR UPDATE`,
        [item.variantId, item.productId]);
      if (variantResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Uno o più prodotti nel carrello non sono più disponibili." }, { status: 400 });
      }
      const variant = variantResult.rows[0];
      if (variant.stock < item.quantity) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Stock insufficiente per uno o più prodotti nel carrello." }, { status: 409 });
      }
      items.push({ productId: item.productId, variantId: item.variantId, quantity: item.quantity, price: Number(variant.price) });
    }

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const shippingCost = subtotal >= 150 ? 0 : 9.90;
    const total = subtotal + shippingCost;
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const orderResult = await client.query(
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

    for (const item of items) {
      await client.query(
        `INSERT INTO order_item (quantity, unit_price, total_price, order_id, product_id, variant_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [item.quantity, item.price.toFixed(2), (item.price * item.quantity).toFixed(2), order.id, item.productId, item.variantId]);
      await client.query(`UPDATE product_variant SET stock = stock - $1 WHERE id = $2`,
        [item.quantity, item.variantId]);
    }

    if (data.newsletterConsent) {
      await client.query(`INSERT INTO newsletter_subscriber (email) VALUES ($1) ON CONFLICT (email) DO NOTHING`, [data.email]);
    }

    await client.query("COMMIT");

    return NextResponse.json({ success: true, order: { id: order.id, orderNumber: order.order_number, total: total.toFixed(2) } });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore durante il checkout." }, { status: 500 });
  } finally {
    client.release();
  }
}
