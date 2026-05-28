/**
 * Initialize the new Supabase database.
 * Creates all tables and the admin user.
 * Run: npx tsx scripts/init-db.ts
 */
import { Pool } from "pg";
import { config } from "dotenv";
config();

const SQL = `
-- Enums
DO $$ BEGIN CREATE TYPE "DiscountType" AS ENUM('PERCENTAGE', 'FIXED_AMOUNT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "OrderStatus" AS ENUM('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PaymentStatus" AS ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ReturnStatus" AS ENUM('NONE', 'REQUESTED', 'APPROVED', 'REJECTED', 'RECEIVED', 'REFUNDED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "StockMovementType" AS ENUM('RECEIVED', 'SOLD', 'ADJUSTMENT', 'RETURNED', 'DAMAGED', 'TRANSFERRED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "UserRole" AS ENUM('CUSTOMER', 'ADMIN', 'WAREHOUSE', 'SUPPORT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Auth tables
CREATE TABLE IF NOT EXISTS "User" ("id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "name" varchar(255), "email" varchar(255) UNIQUE, "emailVerified" timestamp, "image" varchar(255), "role" varchar(20) DEFAULT 'CUSTOMER' NOT NULL, "phone" varchar(50), "createdAt" timestamp DEFAULT now() NOT NULL, "updatedAt" timestamp DEFAULT now() NOT NULL);
CREATE TABLE IF NOT EXISTS "Account" ("userId" varchar(255) NOT NULL REFERENCES "User"(id) ON DELETE CASCADE, "type" varchar(255) NOT NULL, "provider" varchar(255) NOT NULL, "providerAccountId" varchar(255) NOT NULL, "refresh_token" text, "access_token" text, "expires_at" integer, "token_type" varchar(255), "scope" varchar(255), "id_token" text, "session_state" varchar(255), PRIMARY KEY("provider","providerAccountId"));
CREATE TABLE IF NOT EXISTS "Session" ("sessionToken" varchar(255) PRIMARY KEY NOT NULL, "userId" varchar(255) NOT NULL REFERENCES "User"(id) ON DELETE CASCADE, "expires" timestamp NOT NULL);
CREATE TABLE IF NOT EXISTS "VerificationToken" ("identifier" varchar(255) NOT NULL, "token" varchar(255) NOT NULL UNIQUE, "expires" timestamp NOT NULL, PRIMARY KEY("identifier","token"));

-- Catalog
CREATE TABLE IF NOT EXISTS "Category" ("id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "name" varchar(255) NOT NULL, "slug" varchar(255) NOT NULL UNIQUE, "description" text, "image" varchar(255), "parentId" varchar(255), "sortOrder" integer DEFAULT 0 NOT NULL, "createdAt" timestamp DEFAULT now() NOT NULL, "updatedAt" timestamp DEFAULT now() NOT NULL);
CREATE TABLE IF NOT EXISTS "Brand" ("id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "name" varchar(255) NOT NULL, "slug" varchar(255) NOT NULL UNIQUE, "logo" varchar(255), "createdAt" timestamp DEFAULT now() NOT NULL, "updatedAt" timestamp DEFAULT now() NOT NULL);
CREATE TABLE IF NOT EXISTS "Product" ("id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "identifier" varchar(255) NOT NULL UNIQUE, "title" varchar(255) NOT NULL, "slug" varchar(255) NOT NULL UNIQUE, "description" text, "content" text, "basePrice" numeric(10,2) NOT NULL, "compareAtPrice" numeric(10,2), "costPrice" numeric(10,2), "sku" varchar(255), "barcode" varchar(255), "weight" numeric(8,2), "seoTitle" varchar(255), "seoDescription" text, "published" boolean DEFAULT false NOT NULL, "featured" boolean DEFAULT false NOT NULL, "sortOrder" integer DEFAULT 0 NOT NULL, "createdAt" timestamp DEFAULT now() NOT NULL, "updatedAt" timestamp DEFAULT now() NOT NULL, "categoryId" varchar(255) NOT NULL REFERENCES "Category"(id), "brandId" varchar(255) REFERENCES "Brand"(id));
CREATE TABLE IF NOT EXISTS "ProductVariant" ("id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "name" varchar(255) NOT NULL, "sku" varchar(255), "price" numeric(10,2) NOT NULL, "stock" integer DEFAULT 0 NOT NULL, "lowStock" integer DEFAULT 5 NOT NULL, "image" varchar(255), "sortOrder" integer DEFAULT 0 NOT NULL, "createdAt" timestamp DEFAULT now() NOT NULL, "updatedAt" timestamp DEFAULT now() NOT NULL, "productId" varchar(255) NOT NULL REFERENCES "Product"(id) ON DELETE CASCADE, UNIQUE("productId","name"));
CREATE TABLE IF NOT EXISTS "ProductImage" ("id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "url" varchar(500) NOT NULL, "alt" varchar(255), "sortOrder" integer DEFAULT 0 NOT NULL, "createdAt" timestamp DEFAULT now() NOT NULL, "productId" varchar(255) NOT NULL REFERENCES "Product"(id) ON DELETE CASCADE);

-- Reviews
CREATE TABLE IF NOT EXISTS "Review" ("id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "rating" integer NOT NULL, "title" varchar(255), "body" text, "approved" boolean DEFAULT false NOT NULL, "createdAt" timestamp DEFAULT now() NOT NULL, "updatedAt" timestamp DEFAULT now() NOT NULL, "userId" varchar(255) NOT NULL REFERENCES "User"(id), "productId" varchar(255) NOT NULL REFERENCES "Product"(id) ON DELETE CASCADE, UNIQUE("userId","productId"));
CREATE TABLE IF NOT EXISTS "Question" ("id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "body" text NOT NULL, "answer" text, "answeredAt" timestamp, "createdAt" timestamp DEFAULT now() NOT NULL, "userId" varchar(255) NOT NULL REFERENCES "User"(id), "productId" varchar(255) NOT NULL REFERENCES "Product"(id) ON DELETE CASCADE);

-- Orders
CREATE TABLE IF NOT EXISTS "Order" ("id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "orderNumber" varchar(255) NOT NULL UNIQUE, "status" varchar(50) DEFAULT 'PENDING' NOT NULL, "subtotal" numeric(10,2) NOT NULL, "shippingCost" numeric(10,2) DEFAULT '0' NOT NULL, "discount" numeric(10,2) DEFAULT '0' NOT NULL, "total" numeric(10,2) NOT NULL, "notes" text, "createdAt" timestamp DEFAULT now() NOT NULL, "updatedAt" timestamp DEFAULT now() NOT NULL, "billingName" varchar(255) NOT NULL, "billingEmail" varchar(255) NOT NULL, "billingPhone" varchar(50), "billingAddress" varchar(500) NOT NULL, "billingCity" varchar(255) NOT NULL, "billingProvince" varchar(255), "billingZip" varchar(20) NOT NULL, "billingCountry" varchar(10) DEFAULT 'IT' NOT NULL, "shippingName" varchar(255), "shippingEmail" varchar(255), "shippingPhone" varchar(50), "shippingAddress" varchar(500), "shippingCity" varchar(255), "shippingProvince" varchar(255), "shippingZip" varchar(20), "shippingCountry" varchar(10), "shippingMethod" varchar(255), "trackingNumber" varchar(255), "trackingUrl" varchar(500), "paymentMethod" varchar(255), "paymentId" varchar(255), "paymentStatus" varchar(50) DEFAULT 'PENDING' NOT NULL, "paidAt" timestamp, "invoiceUrl" varchar(500), "returnRequested" boolean DEFAULT false NOT NULL, "returnReason" text, "returnStatus" varchar(50) DEFAULT 'NONE', "returnedAt" timestamp, "userId" varchar(255) NOT NULL REFERENCES "User"(id), "couponId" varchar(255));
CREATE TABLE IF NOT EXISTS "OrderItem" ("id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "quantity" integer NOT NULL, "unitPrice" numeric(10,2) NOT NULL, "totalPrice" numeric(10,2) NOT NULL, "orderId" varchar(255) NOT NULL REFERENCES "Order"(id) ON DELETE CASCADE, "productId" varchar(255) NOT NULL REFERENCES "Product"(id), "variantId" varchar(255) REFERENCES "ProductVariant"(id));

-- Promotions
CREATE TABLE IF NOT EXISTS "Coupon" ("id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "code" varchar(255) NOT NULL UNIQUE, "description" text, "discountType" varchar(50) NOT NULL, "discountValue" numeric(10,2) NOT NULL, "minOrderAmount" numeric(10,2), "maxUses" integer, "usedCount" integer DEFAULT 0 NOT NULL, "startsAt" timestamp, "expiresAt" timestamp, "isActive" boolean DEFAULT true NOT NULL, "createdAt" timestamp DEFAULT now() NOT NULL);
CREATE TABLE IF NOT EXISTS "CouponProduct" ("couponId" varchar(255) NOT NULL REFERENCES "Coupon"(id) ON DELETE CASCADE, "productId" varchar(255) NOT NULL REFERENCES "Product"(id) ON DELETE CASCADE, UNIQUE("couponId","productId"));
CREATE TABLE IF NOT EXISTS "NewsletterSubscriber" ("id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "email" varchar(255) NOT NULL UNIQUE, "active" boolean DEFAULT true NOT NULL, "createdAt" timestamp DEFAULT now() NOT NULL);

-- Blog
CREATE TABLE IF NOT EXISTS "BlogPost" ("id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "title" varchar(255) NOT NULL, "slug" varchar(255) NOT NULL UNIQUE, "excerpt" text, "content" text NOT NULL, "coverImage" varchar(255), "seoTitle" varchar(255), "seoDescription" text, "published" boolean DEFAULT false NOT NULL, "publishedAt" timestamp, "createdAt" timestamp DEFAULT now() NOT NULL, "updatedAt" timestamp DEFAULT now() NOT NULL, "authorId" varchar(255) NOT NULL REFERENCES "User"(id));

-- Wishlist & Stock
CREATE TABLE IF NOT EXISTS "WishlistItem" ("id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "createdAt" timestamp DEFAULT now() NOT NULL, "userId" varchar(255) NOT NULL REFERENCES "User"(id) ON DELETE CASCADE, "productId" varchar(255) NOT NULL REFERENCES "Product"(id) ON DELETE CASCADE, UNIQUE("userId","productId"));
CREATE TABLE IF NOT EXISTS "StockMovement" ("id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "quantity" integer NOT NULL, "type" varchar(50) NOT NULL, "note" text, "createdAt" timestamp DEFAULT now() NOT NULL, "variantId" varchar(255) NOT NULL REFERENCES "ProductVariant"(id) ON DELETE CASCADE, "userId" varchar(255) REFERENCES "User"(id));
`;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Test connection
  await pool.query("SELECT 1");
  console.log("✓ Database connected");

  // Execute all SQL
  await pool.query(SQL);
  console.log("✓ All tables created");

  // Create admin user
  const email = "davide.anezakis@gmail.com";
  const existing = await pool.query(
    `SELECT id, email, role FROM "User" WHERE email = $1`,
    [email]
  );

  if (existing.rows.length > 0) {
    if (existing.rows[0].role !== "ADMIN") {
      await pool.query(`UPDATE "User" SET role = $1 WHERE email = $2`, ["ADMIN", email]);
      console.log(`✓ User ${email} promoted to ADMIN`);
    } else {
      console.log(`✓ User ${email} is already ADMIN`);
    }
  } else {
    await pool.query(`INSERT INTO "User" (email, role) VALUES ($1, $2)`, [email, "ADMIN"]);
    console.log(`✓ Admin user created: ${email}`);
  }

  await pool.end();
  console.log("\n✅ Database initialized successfully!");
}

main().catch((e) => {
  console.error("✗ Failed:", e.message);
  process.exit(1);
});
