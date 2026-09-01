import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  varchar,
  text,
  timestamp,
  integer,
  decimal,
  boolean,
  unique,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

// ─── Enums ────────────────────────────────────────────────────────
//
// PostgreSQL enum type names. These match what's in the database and
// cannot be renamed without a migration. Use PascalCase here to match
// the DB (created by the original PascalCase schema migration).

export const orderStatusEnum = pgEnum("OrderStatus", [
  "PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED",
]);
export const paymentStatusEnum = pgEnum("PaymentStatus", [
  "PENDING", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED",
]);
export const returnStatusEnum = pgEnum("ReturnStatus", [
  "NONE", "REQUESTED", "APPROVED", "REJECTED", "RECEIVED", "REFUNDED",
]);
export const stockMovementTypeEnum = pgEnum("StockMovementType", [
  "RECEIVED", "SOLD", "ADJUSTMENT", "RETURNED", "DAMAGED", "TRANSFERRED",
]);
export const discountTypeEnum = pgEnum("DiscountType", ["PERCENTAGE", "FIXED_AMOUNT"]);

// ─── Catalog ──────────────────────────────────────────────────────

export const categories = pgTable("category", {
  id: varchar("id", { length: 255 }).primaryKey().notNull().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  image: varchar("image", { length: 255 }),
  parentId: varchar("parent_id", { length: 255 }),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const brands = pgTable("brand", {
  id: varchar("id", { length: 255 }).primaryKey().notNull().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  logo: varchar("logo", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const products = pgTable("product", {
  id: varchar("id", { length: 255 }).primaryKey().notNull().default(sql`gen_random_uuid()`),
  identifier: varchar("identifier", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  content: text("content"),
  specifications: text("specifications"),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  compareAtPrice: decimal("compare_at_price", { precision: 10, scale: 2 }),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
  sku: varchar("sku", { length: 255 }),
  barcode: varchar("barcode", { length: 255 }),
  weight: decimal("weight", { precision: 8, scale: 2 }),
  seoTitle: varchar("seo_title", { length: 255 }),
  seoDescription: text("seo_description"),
  published: boolean("published").default(false).notNull(),
  featured: boolean("featured").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  categoryId: varchar("category_id", { length: 255 }).references(() => categories.id),
  brandId: varchar("brand_id", { length: 255 }).references(() => brands.id),
});

export const productVariants = pgTable(
  "product_variant",
  {
    id: varchar("id", { length: 255 }).primaryKey().notNull().default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 255 }).notNull(),
    sku: varchar("sku", { length: 255 }),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    stock: integer("stock").default(0).notNull(),
    lowStock: integer("low_stock").default(5).notNull(),
    image: varchar("image", { length: 255 }),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    productId: varchar("product_id", { length: 255 }).notNull().references(() => products.id, { onDelete: "cascade" }),
  },
  (table) => ({ uniqueProductVariant: unique().on(table.productId, table.name) }),
);

export const productImages = pgTable("product_image", {
  id: varchar("id", { length: 255 }).primaryKey().notNull().default(sql`gen_random_uuid()`),
  url: varchar("url", { length: 500 }).notNull(),
  alt: varchar("alt", { length: 255 }),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  productId: varchar("product_id", { length: 255 }).notNull().references(() => products.id, { onDelete: "cascade" }),
});

// ─── Reviews & Questions ──────────────────────────────────────────

export const reviews = pgTable("review", {
  id: varchar("id", { length: 255 }).primaryKey().notNull().default(sql`gen_random_uuid()`),
  rating: integer("rating").notNull(),
  title: varchar("title", { length: 255 }),
  body: text("body"),
  approved: boolean("approved").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  productId: varchar("product_id", { length: 255 }).notNull().references(() => products.id, { onDelete: "cascade" }),
}, (table) => ({ uniqueUserProduct: unique().on(table.userId, table.productId) }));

export const questions = pgTable("question", {
  id: varchar("id", { length: 255 }).primaryKey().notNull().default(sql`gen_random_uuid()`),
  body: text("body").notNull(),
  answer: text("answer"),
  answeredAt: timestamp("answered_at", { mode: "date" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  productId: varchar("product_id", { length: 255 }).notNull().references(() => products.id, { onDelete: "cascade" }),
});

// ─── Orders ───────────────────────────────────────────────────────

export const orders = pgTable("order", {
  id: varchar("id", { length: 255 }).primaryKey().notNull().default(sql`gen_random_uuid()`),
  orderNumber: varchar("order_number", { length: 255 }).notNull().unique(),
  status: varchar("status", { length: 50 }).default("PENDING").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }).default("0").notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0").notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  billingName: varchar("billing_name", { length: 255 }).notNull(),
  billingEmail: varchar("billing_email", { length: 255 }).notNull(),
  billingPhone: varchar("billing_phone", { length: 50 }),
  billingAddress: varchar("billing_address", { length: 500 }).notNull(),
  billingCity: varchar("billing_city", { length: 255 }).notNull(),
  billingProvince: varchar("billing_province", { length: 255 }),
  billingZip: varchar("billing_zip", { length: 20 }).notNull(),
  billingCountry: varchar("billing_country", { length: 10 }).default("IT").notNull(),
  shippingName: varchar("shipping_name", { length: 255 }),
  shippingEmail: varchar("shipping_email", { length: 255 }),
  shippingPhone: varchar("shipping_phone", { length: 50 }),
  shippingAddress: varchar("shipping_address", { length: 500 }),
  shippingCity: varchar("shipping_city", { length: 255 }),
  shippingProvince: varchar("shipping_province", { length: 255 }),
  shippingZip: varchar("shipping_zip", { length: 20 }),
  shippingCountry: varchar("shipping_country", { length: 10 }),
  shippingMethod: varchar("shipping_method", { length: 255 }),
  trackingNumber: varchar("tracking_number", { length: 255 }),
  trackingUrl: varchar("tracking_url", { length: 500 }),
  paymentMethod: varchar("payment_method", { length: 255 }),
  paymentId: varchar("payment_id", { length: 255 }),
  paymentStatus: varchar("payment_status", { length: 50 }).default("PENDING").notNull(),
  paidAt: timestamp("paid_at", { mode: "date" }),
  invoiceUrl: varchar("invoice_url", { length: 500 }),
  returnRequested: boolean("return_requested").default(false).notNull(),
  returnReason: text("return_reason"),
  returnStatus: varchar("return_status", { length: 50 }).default("NONE"),
  returnedAt: timestamp("returned_at", { mode: "date" }),
  userId: varchar("user_id", { length: 255 }).references(() => users.id),
  couponId: varchar("coupon_id", { length: 255 }),
});

export const orderItems = pgTable("order_item", {
  id: varchar("id", { length: 255 }).primaryKey().notNull().default(sql`gen_random_uuid()`),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  orderId: varchar("order_id", { length: 255 }).notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: varchar("product_id", { length: 255 }).notNull().references(() => products.id),
  variantId: varchar("variant_id", { length: 255 }).references(() => productVariants.id),
});

// ─── Promotions ───────────────────────────────────────────────────

export const coupons = pgTable("coupon", {
  id: varchar("id", { length: 255 }).primaryKey().notNull().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 255 }).notNull().unique(),
  description: text("description"),
  discountType: varchar("discount_type", { length: 50 }).notNull(),
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").default(0).notNull(),
  startsAt: timestamp("starts_at", { mode: "date" }),
  expiresAt: timestamp("expires_at", { mode: "date" }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const couponProducts = pgTable("coupon_product", {
  couponId: varchar("coupon_id", { length: 255 }).notNull().references(() => coupons.id, { onDelete: "cascade" }),
  productId: varchar("product_id", { length: 255 }).notNull().references(() => products.id, { onDelete: "cascade" }),
}, (table) => ({ compoundKey: unique().on(table.couponId, table.productId) }));

// ─── Newsletter ───────────────────────────────────────────────────

export const newsletterSubscribers = pgTable("newsletter_subscriber", {
  id: varchar("id", { length: 255 }).primaryKey().notNull().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull().unique(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Blog ─────────────────────────────────────────────────────────

export const blogPosts = pgTable("blog_post", {
  id: varchar("id", { length: 255 }).primaryKey().notNull().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  coverImage: varchar("cover_image", { length: 255 }),
  seoTitle: varchar("seo_title", { length: 255 }),
  seoDescription: text("seo_description"),
  published: boolean("published").default(false).notNull(),
  publishedAt: timestamp("published_at", { mode: "date" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  authorId: varchar("author_id", { length: 255 }).notNull().references(() => users.id),
});

// ─── Wishlist ─────────────────────────────────────────────────────

export const wishlistItems = pgTable("wishlist_item", {
  id: varchar("id", { length: 255 }).primaryKey().notNull().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: varchar("product_id", { length: 255 }).notNull().references(() => products.id, { onDelete: "cascade" }),
}, (table) => ({ uniqueUserProduct: unique().on(table.userId, table.productId) }));

// ─── Stock Movements ───────────────────────────────────────────────

export const stockMovements = pgTable("stock_movement", {
  id: varchar("id", { length: 255 }).primaryKey().notNull().default(sql`gen_random_uuid()`),
  quantity: integer("quantity").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  variantId: varchar("variant_id", { length: 255 }).notNull().references(() => productVariants.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }).references(() => users.id),
});
