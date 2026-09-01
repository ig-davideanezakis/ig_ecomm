import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorize } from "@/lib/auth-helpers";

const MAX_IMAGES = 100;

interface ReorderItem {
  id: string;
  sortOrder: number;
}

/**
 * POST /api/admin/product-images/reorder
 * Reorders a product's gallery images (sort_order) and marks the first
 * image as the cover (cover is implicitly sort_order = 0).
 * Body: { productId: string, images: [{ id: string, sortOrder: number }] }
 */
export async function POST(request: Request) {
  await authorize("ADMIN");

  let body: { productId?: string; images?: ReorderItem[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON richiesto." }, { status: 400 });
  }

  const productId = body.productId?.trim();
  const images = Array.isArray(body.images) ? body.images : [];

  if (!productId) {
    return NextResponse.json({ error: "productId richiesto." }, { status: 400 });
  }
  if (images.length === 0) {
    return NextResponse.json({ error: "Nessuna immagine da riordinare." }, { status: 400 });
  }
  if (images.length > MAX_IMAGES) {
    return NextResponse.json({ error: `Troppe immagini (max ${MAX_IMAGES}).` }, { status: 400 });
  }

  const invalid = images.find(
    (img) =>
      typeof img?.id !== "string" ||
      typeof img?.sortOrder !== "number" ||
      !Number.isInteger(img.sortOrder) ||
      img.sortOrder < 0,
  );
  if (invalid) {
    return NextResponse.json({ error: "Formato non valido: ogni elemento richiede id e sortOrder intero >= 0." }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const img of images) {
      const res = await client.query(
        `UPDATE "product_image" SET "sort_order" = $1
         WHERE id = $2 AND "product_id" = $3`,
        [img.sortOrder, img.id, productId],
      );
      if (res.rowCount === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: `Immagine non trovata per questo prodotto: ${img.id}` },
          { status: 404 },
        );
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    const msg = error instanceof Error ? error.message : "Errore durante il riordino.";
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    client.release();
  }

  return NextResponse.json({ success: true, count: images.length });
}
