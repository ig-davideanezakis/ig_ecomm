import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorize } from "@/lib/auth-helpers";
import { uploadProductImage, deleteProductImage } from "@/lib/supabase-admin";

/**
 * POST /api/admin/upload
 * Uploads a product image to Supabase Storage and saves the URL to the DB.
 * Accepts multipart/form-data with fields: file, productId, alt
 */
export async function POST(request: Request) {
  await authorize("ADMIN");

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    // ── File upload ──────────────────────────────────────────────
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const productId = formData.get("productId") as string | null;
    const alt = formData.get("alt") as string | null;

    if (!file || !productId) {
      return NextResponse.json({ error: "File e productId richiesti." }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Formato non supportato. Usa JPG, PNG, WebP o AVIF." },
        { status: 400 },
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File troppo grande. Max 5MB." }, { status: 400 });
    }

    try {
      const url = await uploadProductImage(file, productId);
      return await saveImageRecord(url, alt, productId);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Errore durante l'upload.";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  } else {
    // ── URL reference (fallback) ─────────────────────────────────
    const { url, alt, productId } = await request.json();
    if (!url || !productId) {
      return NextResponse.json({ error: "URL e productId richiesti." }, { status: 400 });
    }
    return await saveImageRecord(url, alt, productId);
  }
}

/** Shared: save an image URL to the DB */
async function saveImageRecord(url: string, alt: string | null, productId: string) {
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
 * DELETE /api/admin/upload?id=xxx
 * Removes a product image from the DB and Supabase Storage.
 */
export async function DELETE(request: Request) {
  await authorize("ADMIN");

  const { searchParams } = new URL(request.url);
  const imageId = searchParams.get("id");

  if (!imageId) {
    return NextResponse.json({ error: "ID immagine richiesto." }, { status: 400 });
  }

  // Get the URL before deleting the DB record
  const imgResult = await pool.query(
    `SELECT url FROM "product_image" WHERE id = $1 LIMIT 1`,
    [imageId],
  );

  if (imgResult.rows.length > 0) {
    // Delete from storage (non-blocking if it fails — DB record is the source of truth)
    await deleteProductImage(imgResult.rows[0].url).catch(() => {});
  }

  await pool.query(`DELETE FROM "product_image" WHERE id = $1`, [imageId]);
  return NextResponse.json({ success: true });
}
