/**
 * Initialize the database — all snake_case table names.
 * Run: npx tsx scripts/init-db.ts
 */
import { Pool } from "pg";
import { config } from "dotenv";
config();

const SQL = `
-- Rename existing PascalCase tables to snake_case (safe if they exist)
-- Only renames columns that haven't been renamed yet (idempotent)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user' AND column_name='createdAt') THEN
    ALTER TABLE "user" RENAME COLUMN "createdAt" TO "created_at";
    ALTER TABLE "user" RENAME COLUMN "updatedAt" TO "updated_at";
  END IF;
END $$;

-- Rename columns in "product" table
ALTER TABLE IF EXISTS "product" RENAME COLUMN "basePrice" TO "base_price";
ALTER TABLE IF EXISTS "product" RENAME COLUMN "compareAtPrice" TO "compare_at_price";
ALTER TABLE IF EXISTS "product" RENAME COLUMN "costPrice" TO "cost_price";
ALTER TABLE IF EXISTS "product" RENAME COLUMN "seoTitle" TO "seo_title";
ALTER TABLE IF EXISTS "product" RENAME COLUMN "seoDescription" TO "seo_description";
ALTER TABLE IF EXISTS "product" RENAME COLUMN "sortOrder" TO "sort_order";
ALTER TABLE IF EXISTS "product" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE IF EXISTS "product" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE IF EXISTS "product" RENAME COLUMN "categoryId" TO "category_id";
ALTER TABLE IF EXISTS "product" RENAME COLUMN "brandId" TO "brand_id";

-- Rename columns in "product_variant" table
ALTER TABLE IF EXISTS "product_variant" RENAME COLUMN "lowStock" TO "low_stock";
ALTER TABLE IF EXISTS "product_variant" RENAME COLUMN "sortOrder" TO "sort_order";
ALTER TABLE IF EXISTS "product_variant" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE IF EXISTS "product_variant" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE IF EXISTS "product_variant" RENAME COLUMN "productId" TO "product_id";

-- Rename columns in "product_image" table
ALTER TABLE IF EXISTS "product_image" RENAME COLUMN "sortOrder" TO "sort_order";
ALTER TABLE IF EXISTS "product_image" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE IF EXISTS "product_image" RENAME COLUMN "productId" TO "product_id";

-- Rename columns in "category" table
ALTER TABLE IF EXISTS "category" RENAME COLUMN "parentId" TO "parent_id";
ALTER TABLE IF EXISTS "category" RENAME COLUMN "sortOrder" TO "sort_order";
ALTER TABLE IF EXISTS "category" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE IF EXISTS "category" RENAME COLUMN "updatedAt" TO "updated_at";

-- Rename columns in "brand" table
ALTER TABLE IF EXISTS "brand" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE IF EXISTS "brand" RENAME COLUMN "updatedAt" TO "updated_at";

-- Rename columns in "review" table
ALTER TABLE IF EXISTS "review" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE IF EXISTS "review" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE IF EXISTS "review" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE IF EXISTS "review" RENAME COLUMN "productId" TO "product_id";

-- Rename columns in "question" table
ALTER TABLE IF EXISTS "question" RENAME COLUMN "answeredAt" TO "answered_at";
ALTER TABLE IF EXISTS "question" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE IF EXISTS "question" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE IF EXISTS "question" RENAME COLUMN "productId" TO "product_id";

-- Rename columns in "order" table
ALTER TABLE IF EXISTS "order" RENAME COLUMN "orderNumber" TO "order_number";
ALTER TABLE IF EXISTS "order" RENAME COLUMN "shippingCost" TO "shipping_cost";
ALTER TABLE IF EXISTS "order" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE IF EXISTS "order" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE IF EXISTS "order" RENAME COLUMN "billingName" TO "billing_name";
ALTER TABLE IF EXISTS "order" RENAME COLUMN "billingEmail" TO "billing_email";
ALTER TABLE IF EXISTS "order" RENAME COLUMN "billingPhone" TO "billing_phone";
ALTER TABLE IF EXISTS "order" RENAME COLUMN "billingAddress" TO "billing_address";
ALTER TABLE IF EXISTS "order" RENAME COLUMN "billingCity" TO "billing_city";
ALTER TABLE IF EXISTS "order" RENAME COLUMN "billingProvince" TO "billing_province";
ALTER TABLE IF EXISTS "order" RENAME COLUMN "billingZip" TO "billing_zip";
ALTER TABLE IF EXISTS "order" RENAME COLUMN "billingCountry" TO "billing_country";
ALTER TABLE IF EXISTS "order" RENAME COLUMN "shippingName" TO "shipping_name";
ALTER TABLE IF EXISTS "order" RENAME COLUMN "shippingEmail" TO "shipping_email";
ALTER TABLE IF EXISTS "order" RENAME COLUMN "shippingPhone" TO "shipping_phone";
ALTER TABLE IF EXISTS "order" RENAME COLUMN "shippingAddress" TO "shipping_address";
ALTER TABLE IF EXISTS "order" RENAME COLUMN "shippingCity" TO "shipping_city";
ALTER TABLE IF EXISTS "order" RENAME COLUMN "shippingProvince" TO "shipping_province";
ALTER TABLE IF EXISTS "order" RENAME COLUMN "shippingZip" TO "shipping_zip";
ALTER TABLE IF EXISTS "order" RENAME COLUMN "shippingCountry" TO "shipping_country";
ALTER TABLE IF EXISTS "order" RENAME COLUMN "shippingMethod" TO "shipping_method";
ALTER TABLE IF EXISTS "order" RENAME COLUMN "trackingNumber" TO "tracking_number";
ALTER TABLE IF EXISTS "order" RENAME COLUMN "trackingUrl" TO "tracking_url";
ALTER TABLE IF EXISTS "order" RENAME COLUMN "paymentMethod" TO "payment_method";
ALTER TABLE IF EXISTS "order" RENAME COLUMN "paymentId" TO "payment_id";
ALTER TABLE IF EXISTS "order" RENAME COLUMN "paymentStatus" TO "payment_status";
ALTER TABLE IF EXISTS "order" RENAME COLUMN "paidAt" TO "paid_at";
ALTER TABLE IF EXISTS "order" RENAME COLUMN "invoiceUrl" TO "invoice_url";
ALTER TABLE IF EXISTS "order" RENAME COLUMN "returnRequested" TO "return_requested";
ALTER TABLE IF EXISTS "order" RENAME COLUMN "returnReason" TO "return_reason";
ALTER TABLE IF EXISTS "order" RENAME COLUMN "returnStatus" TO "return_status";
ALTER TABLE IF EXISTS "order" RENAME COLUMN "returnedAt" TO "returned_at";
ALTER TABLE IF EXISTS "order" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE IF EXISTS "order" RENAME COLUMN "couponId" TO "coupon_id";

-- Rename columns in "order_item" table
ALTER TABLE IF EXISTS "order_item" RENAME COLUMN "unitPrice" TO "unit_price";
ALTER TABLE IF EXISTS "order_item" RENAME COLUMN "totalPrice" TO "total_price";
ALTER TABLE IF EXISTS "order_item" RENAME COLUMN "orderId" TO "order_id";
ALTER TABLE IF EXISTS "order_item" RENAME COLUMN "productId" TO "product_id";
ALTER TABLE IF EXISTS "order_item" RENAME COLUMN "variantId" TO "variant_id";

-- Rename columns in "coupon" table
ALTER TABLE IF EXISTS "coupon" RENAME COLUMN "discountType" TO "discount_type";
ALTER TABLE IF EXISTS "coupon" RENAME COLUMN "discountValue" TO "discount_value";
ALTER TABLE IF EXISTS "coupon" RENAME COLUMN "minOrderAmount" TO "min_order_amount";
ALTER TABLE IF EXISTS "coupon" RENAME COLUMN "maxUses" TO "max_uses";
ALTER TABLE IF EXISTS "coupon" RENAME COLUMN "usedCount" TO "used_count";
ALTER TABLE IF EXISTS "coupon" RENAME COLUMN "startsAt" TO "starts_at";
ALTER TABLE IF EXISTS "coupon" RENAME COLUMN "expiresAt" TO "expires_at";
ALTER TABLE IF EXISTS "coupon" RENAME COLUMN "isActive" TO "is_active";
ALTER TABLE IF EXISTS "coupon" RENAME COLUMN "createdAt" TO "created_at";

-- Rename columns in "coupon_product" table
ALTER TABLE IF EXISTS "coupon_product" RENAME COLUMN "couponId" TO "coupon_id";
ALTER TABLE IF EXISTS "coupon_product" RENAME COLUMN "productId" TO "product_id";

-- Rename columns in "newsletter_subscriber" table
ALTER TABLE IF EXISTS "newsletter_subscriber" RENAME COLUMN "createdAt" TO "created_at";

-- Rename columns in "blog_post" table
ALTER TABLE IF EXISTS "blog_post" RENAME COLUMN "coverImage" TO "cover_image";
ALTER TABLE IF EXISTS "blog_post" RENAME COLUMN "seoTitle" TO "seo_title";
ALTER TABLE IF EXISTS "blog_post" RENAME COLUMN "seoDescription" TO "seo_description";
ALTER TABLE IF EXISTS "blog_post" RENAME COLUMN "publishedAt" TO "published_at";
ALTER TABLE IF EXISTS "blog_post" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE IF EXISTS "blog_post" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE IF EXISTS "blog_post" RENAME COLUMN "authorId" TO "author_id";

-- Rename columns in "wishlist_item" table
ALTER TABLE IF EXISTS "wishlist_item" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE IF EXISTS "wishlist_item" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE IF EXISTS "wishlist_item" RENAME COLUMN "productId" TO "product_id";

-- Rename columns in "stock_movement" table
ALTER TABLE IF EXISTS "stock_movement" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE IF EXISTS "stock_movement" RENAME COLUMN "variantId" TO "variant_id";
ALTER TABLE IF EXISTS "stock_movement" RENAME COLUMN "userId" TO "user_id";

-- Restore the admin user if it was lost during migration
INSERT INTO "user" (email, role) VALUES ('davide.anezakis@infograf.it', 'ADMIN')
ON CONFLICT (email) DO UPDATE SET role = 'ADMIN';

-- Add 2FA / TOTP columns to user table
ALTER TABLE IF EXISTS "user" ADD COLUMN IF NOT EXISTS totp_secret text;
ALTER TABLE IF EXISTS "user" ADD COLUMN IF NOT EXISTS totp_enabled boolean NOT NULL DEFAULT false;
`;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  await pool.query("SELECT 1");
  console.log("✓ Database connected");

  // Execute migration SQL
  await pool.query(SQL);
  console.log("✓ Migration to snake_case complete");

  await pool.end();
  console.log("\n✅ Database migration successful!");
}

main().catch((e) => {
  console.error("✗ Failed:", e.message);
  process.exit(1);
});
