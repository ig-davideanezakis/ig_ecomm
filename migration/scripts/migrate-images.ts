import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../../.env") });

import mysql from "mysql2/promise";
import { Pool } from "pg";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { execFile } from "child_process";
import { promisify } from "util";
import { readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

import {
  prestashopImageUrl,
  prestashopCategoryImageUrl,
  prestashopBrandImageUrl,
  prestashopLogoUrl,
  extractImgUrls,
  rewriteImgUrls,
  computeCoverFirstSortOrders,
  storagePathForProduct,
  storagePathForCategory,
  storagePathForBrand,
  storagePathForCms,
  contentTypeFor,
} from "./image-utils";

const execFileAsync = promisify(execFile);

// ─── Config ──────────────────────────────────────────────────────
const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT) || 3307,
  user: process.env.MYSQL_USER || "prestashop",
  password: process.env.MYSQL_PASSWORD || "prestashop_pass",
  database: process.env.MYSQL_DATABASE || "prestashop",
};
const TABLE_PREFIX = process.env.PS_PREFIX || "pr_";
const LANG_ID = Number(process.env.PS_LANG_ID) || 2;
const OLD_SITE_URL = (process.env.PS_SITE_URL || "https://www.infografstore.it").replace(/\/$/, "");

const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });

const BUCKET = process.env.SUPABASE_BUCKET || "product-images";
const CONCURRENCY = Number(process.env.IMG_CONCURRENCY) || 8;
const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
const FORCE = process.env.FORCE === "1" || process.env.FORCE === "true"; // re-upload even if row exists

let supabase: SupabaseClient;

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function ensureBucket() {
  if (DRY_RUN) return;
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw new Error(`listBuckets failed: ${error.message}`);
  if (!buckets?.find((b) => b.name === BUCKET)) {
    const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024, // 10MB
    });
    if (createErr) throw new Error(`createBucket failed: ${createErr.message}`);
    console.log(`✓ Bucket "${BUCKET}" created`);
  }
}

// ─── Download + upload ───────────────────────────────────────────
const tmpCache = new Map<string, string>(); // url → local tmp path (only in one process run)

async function downloadToTmp(url: string): Promise<string> {
  if (tmpCache.has(url)) return tmpCache.get(url)!;
  const ext = url.split(".").pop()?.split("?")[0] || "jpg";
  const tmpPath = join(tmpdir(), `ps-img-${Math.random().toString(36).slice(2)}.${ext}`);
  // -4 forces IPv4: Cloudflare skip rule is keyed on the VPS IPv4 address
  // -f fails on HTTP errors so a 404 page never gets uploaded as an image
  await execFileAsync("curl", ["-4", "-sS", "-f", "-L", "--max-time", "30", "-A", "Mozilla/5.0 (ig_ecomm migration)", "-o", tmpPath, url]);
  tmpCache.set(url, tmpPath);
  return tmpPath;
}

/** Returns "200" or similar HTTP status for a URL (no body). Never throws: network errors/timeouts become "000". */
async function httpStatus(url: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync("curl", ["-4", "-sS", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", "10", url]);
    return stdout.trim() || "000";
  } catch {
    return "000";
  }
}

async function uploadBuffer(storagePath: string, filePath: string): Promise<string> {
  const data = await readFile(filePath);
  const { data: uploaded, error } = await supabase.storage.from(BUCKET).upload(storagePath, data, {
    contentType: contentTypeFor(storagePath),
    cacheControl: "31536000",
    upsert: true,
  });
  if (error) throw new Error(`Upload ${storagePath} failed: ${error.message}`);
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(uploaded?.path || storagePath);
  return pub.publicUrl;
}

async function downloadAndUpload(url: string, storagePath: string): Promise<string> {
  if (DRY_RUN) {
    console.log(`  [dry-run] would download ${url} → ${storagePath}`);
    return `https://dry-run/${storagePath}`;
  }
  const tmpPath = await downloadToTmp(url);
  return uploadBuffer(storagePath, tmpPath);
}

// Simple concurrency limiter
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await fn(items[idx]);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ─── Main ────────────────────────────────────────────────────────
async function run() {
  supabase = getSupabase();
  const mysqlConn = await mysql.createConnection(MYSQL_CONFIG);
  console.log("✓ Connected to MySQL (PrestaShop)");
  console.log(`✓ Old store: ${OLD_SITE_URL} | bucket: ${BUCKET} | concurrency: ${CONCURRENCY} | dry-run: ${DRY_RUN}`);
  if (!DRY_RUN) await ensureBucket();

  // Load id maps from the already-migrated PostgreSQL data.
  // NOTE: migrate.ts stores identifier = ps reference (e.g. "ASUS-XG34WCDMS") and
  // falls back to `PS-{id_product}` only when the reference is empty — so we must
  // build the map with the same logic, joining on the MySQL reference.
  console.log("\n--- Loading migrated id maps ---");
  const prodResult = await pgPool.query(`SELECT id, identifier FROM "product"`);
  const idByIdentifier = new Map<string, string>();
  for (const r of prodResult.rows as { id: string; identifier: string }[]) {
    idByIdentifier.set(r.identifier, r.id);
  }
  const [psProducts] = (await mysqlConn.execute(
    `SELECT id_product, reference FROM ${TABLE_PREFIX}product`
  )) as unknown as [{ id_product: number; reference: string | null }[], unknown];
  const prodByPsId = new Map<number, string>();
  for (const p of psProducts) {
    const identifier = p.reference || `PS-${p.id_product}`;
    const newId = idByIdentifier.get(identifier);
    if (newId) prodByPsId.set(p.id_product, newId);
  }
  const catResult = await pgPool.query(`SELECT id, slug FROM "category"`);
  const catBySlug = new Map<string, string>();
  for (const r of catResult.rows as { id: string; slug: string }[]) catBySlug.set(r.slug, r.id);
  const brandResult = await pgPool.query(`SELECT id, slug FROM "brand"`);
  const brandBySlug = new Map<string, string>();
  for (const r of brandResult.rows as { id: string; slug: string }[]) brandBySlug.set(r.slug, r.id);
  console.log(`  → ${prodByPsId.size} products, ${catBySlug.size} categories, ${brandBySlug.size} brands mapped`);

  // ═══════════════════════════════════════════════════════════════
  // 1. PRODUCT IMAGES → product_image
  // ═══════════════════════════════════════════════════════════════
  console.log("\n--- 1. Product images ---");
  const [imgRows] = (await mysqlConn.execute(
    `SELECT i.id_image, i.id_product, i.position, i.cover, il.legend
     FROM ${TABLE_PREFIX}image i
     LEFT JOIN ${TABLE_PREFIX}image_lang il ON il.id_image = i.id_image AND il.id_lang = ${LANG_ID}
     ORDER BY i.id_product ASC, i.position ASC`
  )) as unknown as [{ id_image: number; id_product: number; position: number; cover: number | null; legend: string | null }[], unknown];

  // Only migrate images for products that were actually migrated
  const relevant = imgRows.filter((r) => prodByPsId.has(r.id_product));
  console.log(`  → ${imgRows.length} images in PS, ${relevant.length} for migrated products`);

  // PrestaShop's default image is flagged with `cover`, which is NOT always the
  // first position — compute cover-first sort orders per product so the migrated
  // gallery respects the original default image and ordering.
  const imagesByProduct = new Map<number, typeof relevant>();
  for (const r of relevant) {
    const list = imagesByProduct.get(r.id_product) || [];
    list.push(r);
    imagesByProduct.set(r.id_product, list);
  }
  const sortOrderByImageId = new Map<number, number>();
  for (const [, imgs] of imagesByProduct) {
    const orders = computeCoverFirstSortOrders(imgs.map((i) => ({ id: i.id_image, position: i.position, cover: i.cover })));
    for (const [imgId, order] of orders) sortOrderByImageId.set(Number(imgId), order);
  }

  // Skip images already present unless FORCE
  const existingUrls = new Set<string>();
  if (!FORCE) {
    const existingResult = await pgPool.query(`SELECT url FROM "product_image"`);
    for (const r of existingResult.rows as { url: string }[]) existingUrls.add(r.url);
  }

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;
  await mapLimit(relevant, CONCURRENCY, async (row) => {
    const newProductId = prodByPsId.get(row.id_product)!;
    const url = prestashopImageUrl(OLD_SITE_URL, row.id_image);
    const storagePath = storagePathForProduct(row.id_product, row.id_image);
    // Public URL is deterministic — skip download+upload when the row already exists
    const expectedUrl = DRY_RUN ? `https://dry-run/${storagePath}` : supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
    if (existingUrls.has(expectedUrl) && !FORCE) {
      skipped++;
      return;
    }
    let publicUrl: string;
    try {
      publicUrl = await downloadAndUpload(url, storagePath);
    } catch {
      // Dead reference (404/timeout) — skip, count it, keep going
      failed++;
      return;
    }
    if (existingUrls.has(publicUrl) && !FORCE) {
      skipped++;
      return;
    }
    if (!DRY_RUN) {
      await pgPool.query(
        `INSERT INTO "product_image" (url, alt, sort_order, product_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [publicUrl, row.legend || null, sortOrderByImageId.get(row.id_image) ?? row.position, newProductId]
      );
    }
    uploaded++;
  });
  console.log(`  → ${uploaded} uploaded, ${skipped} already present, ${failed} failed/dead`);

  // ═══════════════════════════════════════════════════════════════
  // 2. CATEGORY IMAGES → category.image
  // ═══════════════════════════════════════════════════════════════
  console.log("\n--- 2. Category images ---");
  const [catPsRows] = (await mysqlConn.execute(
    `SELECT c.id_category, cl.link_rewrite, c.active
     FROM ${TABLE_PREFIX}category c
     JOIN ${TABLE_PREFIX}category_lang cl ON cl.id_category = c.id_category AND cl.id_lang = ${LANG_ID}
     WHERE c.active = 1 AND c.id_parent > 1
     ORDER BY c.id_category ASC`
  )) as unknown as [{ id_category: number; link_rewrite: string | null; active: number }[], unknown];

  let catUploaded = 0;
  let catMissing = 0;
  // PrestaShop allows duplicate link_rewrite values; migrate.ts dedupes them in
  // PostgreSQL with a numeric suffix in id_category order ("slug", "slug-2", ...).
  // Replicate that logic: the k-th occurrence of a slug maps to `slug` (k=1) or
  // `slug-{k}` (k>1).
  const slugOccurrences = new Map<string, number>();
  for (const c of catPsRows) {
    const baseSlug = c.link_rewrite || "";
    const k = (slugOccurrences.get(baseSlug) || 0) + 1;
    slugOccurrences.set(baseSlug, k);
    const newCatId = k === 1 ? catBySlug.get(baseSlug) : catBySlug.get(`${baseSlug}-${k}`);
    if (!newCatId) continue;
    const url = prestashopCategoryImageUrl(OLD_SITE_URL, c.id_category);
    const status = await httpStatus(url);
    if (status !== "200") {
      catMissing++;
      continue;
    }
    const publicUrl = await downloadAndUpload(url, storagePathForCategory(c.id_category));
    if (!DRY_RUN) {
      await pgPool.query(`UPDATE "category" SET image = $1, updated_at = NOW() WHERE id = $2`, [publicUrl, newCatId]);
    }
    catUploaded++;
  }
  console.log(`  → ${catUploaded} category images migrated, ${catMissing} missing/404`);

  // ═══════════════════════════════════════════════════════════════
  // 3. BRAND LOGOS → brand.logo
  // ═══════════════════════════════════════════════════════════════
  console.log("\n--- 3. Brand logos ---");
  const [brandPsRows] = (await mysqlConn.execute(
    `SELECT m.id_manufacturer, m.name FROM ${TABLE_PREFIX}manufacturer m WHERE m.active = 1`
  )) as unknown as [{ id_manufacturer: number; name: string }[], unknown];

  function slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  let brandUploaded = 0;
  let brandMissing = 0;
  for (const b of brandPsRows) {
    const newBrandId = brandBySlug.get(slugify(b.name));
    if (!newBrandId) continue;
    const url = prestashopBrandImageUrl(OLD_SITE_URL, b.id_manufacturer);
    const status = await httpStatus(url);
    if (status !== "200") {
      brandMissing++;
      continue;
    }
    const publicUrl = await downloadAndUpload(url, storagePathForBrand(b.id_manufacturer));
    if (!DRY_RUN) {
      await pgPool.query(`UPDATE "brand" SET logo = $1, updated_at = NOW() WHERE id = $2`, [publicUrl, newBrandId]);
    }
    brandUploaded++;
  }
  console.log(`  → ${brandUploaded} brand logos migrated, ${brandMissing} missing/404`);

  // ═══════════════════════════════════════════════════════════════
  // 4. CMS / content images → rewrite URLs in migrated content
  // ═══════════════════════════════════════════════════════════════
  console.log("\n--- 4. CMS content images ---");
  // Find every /img/ URL referenced by migrated product content
  const contentResult = await pgPool.query(
    `SELECT id, content, description FROM "product" WHERE content IS NOT NULL OR description IS NOT NULL`
  );
  const contentRows = contentResult.rows as { id: string; content: string | null; description: string | null }[];
  const referencedUrls = new Set<string>();
  for (const r of contentRows) {
    for (const u of extractImgUrls(r.content || "", OLD_SITE_URL)) referencedUrls.add(u);
    for (const u of extractImgUrls(r.description || "", OLD_SITE_URL)) referencedUrls.add(u);
  }
  console.log(`  → ${referencedUrls.size} distinct image URLs referenced by product content`);

  const urlMap = new Map<string, string>();
  let cmsFailed = 0;
  for (const url of referencedUrls) {
    const filename = url.split("/img/")[1];
    if (!filename) continue;
    const storagePath = storagePathForCms(filename);
    try {
      const publicUrl = await downloadAndUpload(url, storagePath);
      urlMap.set(url, publicUrl);
    } catch {
      // Dead reference (404/timeout) — leave the original URL untouched
      cmsFailed++;
    }
  }
  console.log(`  → ${urlMap.size} CMS images migrated, ${cmsFailed} dead references skipped`);

  if (!DRY_RUN && urlMap.size > 0) {
    for (const r of contentRows as { id: string; content: string | null; description: string | null }[]) {
      const newContent = rewriteImgUrls(r.content || "", urlMap);
      const newDescription = rewriteImgUrls(r.description || "", urlMap);
      if (newContent !== r.content || newDescription !== r.description) {
        await pgPool.query(
          `UPDATE "product" SET content = $1, description = $2, updated_at = NOW() WHERE id = $3`,
          [newContent, newDescription, r.id]
        );
      }
    }
    console.log(`  → rewrote ${urlMap.size} URLs in product content`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 5. STORE LOGO → store_setting
  // ═══════════════════════════════════════════════════════════════
  console.log("\n--- 5. Store logo ---");
  const logoStatus = await httpStatus(prestashopLogoUrl(OLD_SITE_URL));
  if (logoStatus === "200") {
    const publicUrl = await downloadAndUpload(prestashopLogoUrl(OLD_SITE_URL), "store/logo.jpg");
    if (!DRY_RUN) {
      await pgPool.query(
        `INSERT INTO "store_setting" (key, value, updated_at) VALUES ('store_logo', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [publicUrl]
      );
    }
    console.log(`  → store logo saved`);
  } else {
    console.log(`  → store logo not found (${logoStatus})`);
  }

  await mysqlConn.end();
  await pgPool.end();
  console.log("\n✅ Image migration completed!");
}

run().catch((err) => {
  console.error("Image migration failed:", err);
  process.exit(1);
});
