import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorize } from "@/lib/auth-helpers";

/**
 * POST /api/admin/upload
 * Uploads a product image. In MVP, stores a URL reference.
 * In production, this would handle file upload to Supabase Storage.
 *
 * Body: { url: string, alt?: string, productId: string }
 */
export async function POST(request: Request) {
  await authorize("ADMIN");

  const { url, alt, productId } = await request.json();

  if (!url || !productId) {
    return NextResponse.json({ error: "URL e productId richiesti." }, { status: 400 });
  }

  // Get max sort order for this product
  const maxResult = await pool.query(
    `SELECT COALESCE(MAX("sort_order"), -1) + 1 as next_order FROM "product_image" WHERE "product_id" = $1`,
    [productId],
  );
  const sortOrder = maxResult.rows[0]?.next_order ?? 0;

  const result = await pool.query(
    `INSERT INTO "product_image" (url, alt, sort_order, product_id)
     VALUES ($1, $2, $3, $4) RETURNING id, url, alt, sort_order`,
    [url, alt || null, sortOrder, productId],
  );

  return NextResponse.json({ success: true, image: result.rows[0] });
}

/**
 * DELETE /api/admin/upload
 * Removes a product image by id.
 */
export async function DELETE(request: Request) {
  await authorize("ADMIN");

  const { searchParams } = new URL(request.url);
  const imageId = searchParams.get("id");

  if (!imageId) {
    return NextResponse.json({ error: "ID immagine richiesto." }, { status: 400 });
  }

  await pool.query(`DELETE FROM "product_image" WHERE id = $1`, [imageId]);
  return NextResponse.json({ success: true });
}
