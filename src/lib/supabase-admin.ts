import { createClient } from "@supabase/supabase-js";

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
