import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

/**
 * Supabase admin client — uses service_role key for storage operations.
 * Only used server-side (never exposed to the client).
 * Lazily initialized to avoid build-time env var requirement.
 */
let _supabaseAdmin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
    }
    _supabaseAdmin = createClient(url, key, {
      auth: { persistSession: false },
    });
  }
  return _supabaseAdmin;
}

const BUCKET = "product-images";

/**
 * Ensures the product-images bucket exists, creating it if needed.
 */
export async function ensureBucket() {
  const admin = getSupabaseAdmin();
  const { data: buckets } = await admin.storage.listBuckets();
  if (!buckets?.find((b) => b.name === BUCKET)) {
    await admin.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024, // 5MB
    });
  }
}

/**
 * Uploads a file to Supabase Storage under product-images/.
 * Returns the public URL.
 */
export async function uploadProductImage(
  file: File,
  productId: string,
): Promise<string> {
  const admin = getSupabaseAdmin();
  await ensureBucket();

  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `products/${productId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

  const { error } = await admin.storage
    .from(BUCKET)
    .upload(fileName, file, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data: publicUrl } = admin.storage
    .from(BUCKET)
    .getPublicUrl(fileName);

  return publicUrl.publicUrl;
}

/**
 * Deletes an image from Supabase Storage by URL.
 */
export async function deleteProductImage(imageUrl: string) {
  const admin = getSupabaseAdmin();
  const url = new URL(imageUrl);
  const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/product-images\/(.+)/);
  if (!pathMatch) return;

  await admin.storage.from(BUCKET).remove([pathMatch[1]]);
}

// ── Icecat image import (server-side copy to Supabase Storage) ──────────────

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

const MAX_SOURCE_BYTES = 20 * 1024 * 1024; // source download guard (Icecat photos can exceed 5MB)
const MAX_OUTPUT_BYTES = 5 * 1024 * 1024; // same limit as manual uploads
const OUTPUT_MAX_DIMENSION = 1600; // px, longest side
const OUTPUT_WEBP_QUALITY = 82;

/** Map a Content-Type header to a file extension, or null if not allowed. */
export function extFromContentType(contentType: string): string | null {
  const base = contentType.split(";")[0].trim().toLowerCase();
  return ALLOWED_IMAGE_TYPES[base] ?? null;
}

/** Validate a downloadable image source (content type + download size guard). */
export function validateImageSource(contentType: string, byteLength: number): string | null {
  if (!extFromContentType(contentType)) {
    return `Formato non supportato (${contentType}). Usa JPG, PNG, WebP o AVIF.`;
  }
  if (byteLength > MAX_SOURCE_BYTES) {
    return `Immagine troppo grande (${Math.round(byteLength / 1024 / 1024)}MB). Max 20MB.`;
  }
  return null;
}

/**
 * Downloads an external image (e.g. from Icecat), downscales it server-side
 * (max 1600px, WebP q82) and uploads it to Supabase Storage under the classic
 * path products/{productId}/{timestamp}-{random}.webp. Returns the public URL.
 */
export async function importImageFromUrl(
  sourceUrl: string,
  productId: string,
): Promise<string> {
  const res = await fetch(sourceUrl, {
    signal: AbortSignal.timeout(15000),
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`Download failed: HTTP ${res.status}`);
  }

  const contentType = res.headers.get("content-type") || "";
  const buffer = await res.arrayBuffer();
  const validationError = validateImageSource(contentType, buffer.byteLength);
  if (validationError) throw new Error(validationError);

  // Downscale + convert to WebP so imports fit the 5MB bucket limit
  const processed = await sharp(Buffer.from(buffer))
    .rotate() // respect EXIF orientation
    .resize(OUTPUT_MAX_DIMENSION, OUTPUT_MAX_DIMENSION, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: OUTPUT_WEBP_QUALITY })
    .toBuffer();

  if (processed.byteLength > MAX_OUTPUT_BYTES) {
    throw new Error(`Immagine elaborata troppo grande (${Math.round(processed.byteLength / 1024 / 1024)}MB).`);
  }

  const admin = getSupabaseAdmin();
  await ensureBucket();

  const fileName = `products/${productId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.webp`;

  const { error } = await admin.storage
    .from(BUCKET)
    .upload(fileName, processed, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data: publicUrl } = admin.storage
    .from(BUCKET)
    .getPublicUrl(fileName);

  return publicUrl.publicUrl;
}

export interface ImportImageItem {
  url: string;
  alt?: string;
}

export interface ImportImageResult {
  imported: { url: string; alt: string }[];
  errors: { url: string; error: string }[];
}

/**
 * Downloads and imports a list of external images into Supabase Storage.
 * Runs with limited concurrency; per-item failures do not abort the batch.
 * The result preserves the input order (important for gallery sort_order).
 */
export async function importImagesFromUrls(
  items: ImportImageItem[],
  productId: string,
  concurrency = 3,
): Promise<ImportImageResult> {
  const imported: ({ url: string; alt: string } | null)[] = new Array(items.length).fill(null);
  const errors: { url: string; error: string }[] = [];
  let nextIndex = 0;

  const worker = async () => {
    while (true) {
      const idx = nextIndex++;
      if (idx >= items.length) return;
      const item = items[idx];
      try {
        const url = await importImageFromUrl(item.url, productId);
        imported[idx] = { url, alt: item.alt || "" };
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Import failed";
        errors.push({ url: item.url, error: msg });
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length || 1) }, () => worker()),
  );

  return {
    imported: imported.filter((x): x is { url: string; alt: string } => x !== null),
    errors,
  };
}
