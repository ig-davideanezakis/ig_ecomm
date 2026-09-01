import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorize } from "@/lib/auth-helpers";
import { importImagesFromUrls, type ImportImageItem } from "@/lib/supabase-admin";

/** Only import from Icecat image hosts — blocks SSRF to internal/arbitrary URLs. */
const ALLOWED_HOSTS = ["images.icecat.biz", "icecat.biz", "bo.icecat.biz"];
const MAX_IMAGES = 20;

function isAllowedImageUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" && ALLOWED_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

/**
 * POST /api/admin/import-images
 * Downloads external images (Icecat) and copies them to Supabase Storage
 * under the classic path products/{productId}/..., then saves product_image rows.
 * Body: { productId: string, images: [{ url, alt? }] }
 */
export async function POST(request: Request) {
  await authorize("ADMIN");

  let body: { productId?: string; images?: ImportImageItem[] };
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
    return NextResponse.json({ error: "Nessuna immagine da importare." }, { status: 400 });
  }
  if (images.length > MAX_IMAGES) {
    return NextResponse.json({ error: `Troppe immagini (max ${MAX_IMAGES}).` }, { status: 400 });
  }

  const invalid = images.find((img) => typeof img.url !== "string" || !isAllowedImageUrl(img.url));
  if (invalid) {
    return NextResponse.json(
      { error: `URL non valido o host non consentito: ${String(invalid?.url).slice(0, 100)}` },
      { status: 400 },
    );
  }

  try {
    const result = await importImagesFromUrls(images, productId);

    // Persist imported URLs as product_image rows, continuing sort_order
    const maxResult = await pool.query(
      `SELECT COALESCE(MAX("sort_order"), -1) + 1 as next_order FROM "product_image" WHERE "product_id" = $1`,
      [productId],
    );
    let sortOrder = Number(maxResult.rows[0]?.next_order ?? 0);

    const saved: { id: number; url: string; alt: string; sort_order: number }[] = [];
    for (const img of result.imported) {
      const insert = await pool.query(
        `INSERT INTO "product_image" (url, alt, sort_order, product_id)
         VALUES ($1, $2, $3, $4) RETURNING id, url, alt, sort_order`,
        [img.url, img.alt || null, sortOrder++, productId],
      );
      saved.push(insert.rows[0]);
    }

    return NextResponse.json({
      success: true,
      imported: saved,
      errors: result.errors,
      failedCount: result.errors.length,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Import failed";
    console.error("[import-images] 500:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
