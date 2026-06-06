import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { auth } from "@/lib/auth";

/**
 * POST /api/checkout
 * Creates an order from cart items. Supports both authenticated users and guests.
 *
 * Body: {
 *   items: Array<{ productId, variantId, title, price, quantity }>,
 *   email, name, phone, address, city, province, zip, country,
 *   shippingMethod, paymentMethod,
 *   newsletterConsent?: boolean   // GDPR opt-in checkbox
 * }
 */
export async function POST(request: Request) {
  const body = await request.json();
  const {
    items, email, name, phone, address, city, province, zip,
    country, shippingMethod, paymentMethod, newsletterConsent,
  } = body;

  // ── Validation ──────────────────────────────────────────────────
  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Carrello vuoto." }, { status: 400 });
  }
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email richiesta." }, { status: 400 });
  }
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "Nome completo richiesto." }, { status: 400 });
  }
  if (!address || !city || !zip) {
    return NextResponse.json({ error: "Indirizzo di spedizione completo richiesto." }, { status: 400 });
  }

  // ── Get user if authenticated ───────────────────────────────────
  const session = await auth();
  const userId = session?.user?.id ?? null;

  // ── Calculate totals ────────────────────────────────────────────
  const subtotal = items.reduce((sum: number, i: { price: number; quantity: number }) => sum + i.price * i.quantity, 0);
  const shippingCost = subtotal >= 150 ? 0 : 9.90; // free shipping over €150
  const total = subtotal + shippingCost;

  // ── Generate order number ───────────────────────────────────────
  const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  // ── Create order ────────────────────────────────────────────────
  const orderResult = await pool.query(
    `INSERT INTO "order" (
      order_number, status, subtotal, shipping_cost, total,
      billing_name, billing_email, billing_phone,
      billing_address, billing_city, billing_province, billing_zip, billing_country,
      shipping_name, shipping_email, shipping_phone,
      shipping_address, shipping_city, shipping_province, shipping_zip, shipping_country,
      shipping_method, payment_method, payment_status,
      user_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
    RETURNING id, order_number`,
    [
      orderNumber, "PENDING", subtotal.toFixed(2), shippingCost.toFixed(2), total.toFixed(2),
      name.trim(), email, phone || null,
      address.trim(), city.trim(), province?.trim() || null, zip.trim(), (country || "IT").trim(),
      name.trim(), email, phone || null,
      address.trim(), city.trim(), province?.trim() || null, zip.trim(), (country || "IT").trim(),
      shippingMethod || "standard", paymentMethod || "card", "PENDING",
      userId,
    ],
  );
  const order = orderResult.rows[0];

  // ── Create order items ─────────────────────────────────────────
  for (const item of items) {
    await pool.query(
      `INSERT INTO order_item (quantity, unit_price, total_price, order_id, product_id, variant_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [item.quantity, item.price.toFixed(2), (item.price * item.quantity).toFixed(2), order.id, item.productId, item.variantId],
    );

    // Decrement stock
    await pool.query(
      `UPDATE product_variant SET stock = stock - $1 WHERE id = $2 AND stock >= $1`,
      [item.quantity, item.variantId],
    );
  }

  // ── Newsletter subscription (GDPR opt-in) ──────────────────────
  if (newsletterConsent) {
    await pool.query(
      `INSERT INTO newsletter_subscriber (email) VALUES ($1) ON CONFLICT (email) DO NOTHING`,
      [email],
    );
  }

  return NextResponse.json({
    success: true,
    order: {
      id: order.id,
      orderNumber: order.order_number,
      total: total.toFixed(2),
    },
  });
}
