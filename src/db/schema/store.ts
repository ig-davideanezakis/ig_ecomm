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

export const userRole = pgEnum("UserRole", ["CUSTOMER", "ADMIN", "WAREHOUSE", "SUPPORT"]);
export const orderStatus = pgEnum("OrderStatus", [
  "PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED",
]);
export const paymentStatus = pgEnum("PaymentStatus", [
  "PENDING", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED",
]);
export const returnStatus = pgEnum("ReturnStatus", [
  "NONE", "REQUESTED", "APPROVED", "REJECTED", "RECEIVED", "REFUNDED",
]);
export const stockMovementType = pgEnum("StockMovementType", [
  "RECEIVED", "SOLD", "ADJUSTMENT", "RETURNED", "DAMAGED", "TRANSFERRED",
]);
export const discountType = pgEnum("DiscountType", ["PERCENTAGE", "FIXED_AMOUNT"]);

// ─── Catalog ──────────────────────────────────────────────────────

export const categories = pgTable("Category", {
  id: varchar("id", { length: 255 }).primaryKey().notNull().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  image: varchar("image", { length: 255 }),
  parentId: varchar("parentId", { length: 255 }),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const brands = pgTable("Brand", {
  id: varchar("id", { length: 255 }).primaryKey().notNull().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  logo: varchar("logo", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const products = pgTable("Product", {
  id: varchar("id", { length: 255 }).primaryKey().notNull().default(sql`gen_random_uuid()`),
  identifier: varchar("identifier", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  content: text("content"),
  basePrice: decimal("basePrice", { precision: 10, scale: 2 }).notNull(),
  compareAtPrice: decimal("compareAtPrice", { precision: 10, scale: 2 }),
  costPrice: decimal("costPrice", { precision: 10, scale: 2 }),
  sku: varchar("sku", { length: 255 }),
  barcode: varchar("barcode", { length: 255 }),
  weight: decimal("weight", { precision: 8, scale: 2 }),
  seoTitle: varchar("seoTitle", { length: 255 }),
  seoDescription: text("seoDescription"),
  published: boolean("published").default(false).notNull(),
  featured: boolean("featured").default(false).notNull(),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  categoryId: varchar("categoryId", { length: 255 }).notNull().references(() => categories.id),
  brandId: varchar("brandId", { length: 255 }).references(() => brands.id),
});

export const productVariants = pgTable(
  "ProductVariant",
  {
    id: varchar("id", { length: 255 }).primaryKey().notNull().default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 255 }).notNull(),
    sku: varchar("sku", { length: 255 }),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    stock: integer("stock").default(0).notNull(),
    lowStock: integer("lowStock").default(5).notNull(),
    image: varchar("image", { length: 255 }),
    sortOrder: integer("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    productId: varchar("productId", { length: 255 }).notNull().references(() => products.id, { onDelete: "cascade" }),
  },
  (table) => ({ uniqueProductVariant: unique().on(table.productId, table.name) }),
);

export const productImages = pgTable("ProductImage", {
  id: varchar("id", { length: 255 }).primaryKey().notNull().default(sql`gen_random_uuid()`),
  url: varchar("url", { length: 500 }).notNull(),
  alt: varchar("alt", { length: 255 }),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  productId: varchar("productId", { length: 255 }).notNull().references(() => products.id, { onDelete: "cascade" }),
});

// ─── Reviews & Questions ──────────────────────────────────────────

export const reviews = pgTable("Review", {
  id: varchar("id", { length: 255 }).primaryKey().notNull().default(sql`gen_random_uuid()`),
  rating: integer("rating").notNull(),
  title: varchar("title", { length: 255 }),
  body: text("body"),
  approved: boolean("approved").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  userId: varchar("userId", { length: 255 }).notNull().references(() => users.id),
  productId: varchar("productId", { length: 255 }).notNull().references(() => products.id, { onDelete: "cascade" }),
}, (table) => ({ uniqueUserProduct: unique().on(table.userId, table.productId) }));

export const questions = pgTable("Question", {
  id: varchar("id", { length: 255 }).primaryKey().notNull().default(sql`gen_random_uuid()`),
  body: text("body").notNull(),
  answer: text("answer"),
  answeredAt: timestamp("answeredAt", { mode: "date" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  userId: varchar("userId", { length: 255 }).notNull().references(() => users.id),
  productId: varchar("productId", { length: 255 }).notNull().references(() => products.id, { onDelete: "cascade" }),
});

// ─── Orders ───────────────────────────────────────────────────────

export const orders = pgTable("Order", {
  id: varchar("id", { length: 255 }).primaryKey().notNull().default(sql`gen_random_uuid()`),
  orderNumber: varchar("orderNumber", { length: 255 }).notNull().unique(),
  status: varchar("status", { length: 50 }).default("PENDING").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  shippingCost: decimal("shippingCost", { precision: 10, scale: 2 }).default("0").notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0").notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  billingName: varchar("billingName", { length: 255 }).notNull(),
  billingEmail: varchar("billingEmail", { length: 255 }).notNull(),
  billingPhone: varchar("billingPhone", { length: 50 }),
  billingAddress: varchar("billingAddress", { length: 500 }).notNull(),
  billingCity: varchar("billingCity", { length: 255 }).notNull(),
  billingProvince: varchar("billingProvince", { length: 255 }),
  billingZip: varchar("billingZip", { length: 20 }).notNull(),
  billingCountry: varchar("billingCountry", { length: 10 }).default("IT").notNull(),
  shippingName: varchar("shippingName", { length: 255 }),
  shippingEmail: varchar("shippingEmail", { length: 255 }),
  shippingPhone: varchar("shippingPhone", { length: 50 }),
  shippingAddress: varchar("shippingAddress", { length: 500 }),
  shippingCity: varchar("shippingCity", { length: 255 }),
  shippingProvince: varchar("shippingProvince", { length: 255 }),
  shippingZip: varchar("shippingZip", { length: 20 }),
  shippingCountry: varchar("shippingCountry", { length: 10 }),
  shippingMethod: varchar("shippingMethod", { length: 255 }),
  trackingNumber: varchar("trackingNumber", { length: 255 }),
  trackingUrl: varchar("trackingUrl", { length: 500 }),
  paymentMethod: varchar("paymentMethod", { length: 255 }),
  paymentId: varchar("paymentId", { length: 255 }),
  paymentStatus: varchar("paymentStatus", { length: 50 }).default("PENDING").notNull(),
  paidAt: timestamp("paidAt", { mode: "date" }),
  invoiceUrl: varchar("invoiceUrl", { length: 500 }),
  returnRequested: boolean("returnRequested").default(false).notNull(),
  returnReason: text("returnReason"),
  returnStatus: varchar("returnStatus", { length: 50 }).default("NONE"),
  returnedAt: timestamp("returnedAt", { mode: "date" }),
  userId: varchar("userId", { length: 255 }).notNull().references(() => users.id),
  couponId: varchar("couponId", { length: 255 }),
});

export const orderItems = pgTable("OrderItem", {
  id: varchar("id", { length: 255 }).primaryKey().notNull().default(sql`gen_random_uuid()`),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }).notNull(),
  orderId: varchar("orderId", { length: 255 }).notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: varchar("productId", { length: 255 }).notNull().references(() => products.id),
  variantId: varchar("variantId", { length: 255 }).references(() => productVariants.id),
});

// ─── Promotions ───────────────────────────────────────────────────

export const coupons = pgTable("Coupon", {
  id: varchar("id", { length: 255 }).primaryKey().notNull().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 255 }).notNull().unique(),
  description: text("description"),
  discountType: varchar("discountType", { length: 50 }).notNull(),
  discountValue: decimal("discountValue", { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: decimal("minOrderAmount", { precision: 10, scale: 2 }),
  maxUses: integer("maxUses"),
  usedCount: integer("usedCount").default(0).notNull(),
  startsAt: timestamp("startsAt", { mode: "date" }),
  expiresAt: timestamp("expiresAt", { mode: "date" }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const couponProducts = pgTable("CouponProduct", {
  couponId: varchar("couponId", { length: 255 }).notNull().references(() => coupons.id, { onDelete: "cascade" }),
  productId: varchar("productId", { length: 255 }).notNull().references(() => products.id, { onDelete: "cascade" }),
}, (table) => ({ compoundKey: unique().on(table.couponId, table.productId) }));

// ─── Newsletter ───────────────────────────────────────────────────

export const newsletterSubscribers = pgTable("NewsletterSubscriber", {
  id: varchar("id", { length: 255 }).primaryKey().notNull().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull().unique(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Blog ─────────────────────────────────────────────────────────

export const blogPosts = pgTable("BlogPost", {
  id: varchar("id", { length: 255 }).primaryKey().notNull().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  coverImage: varchar("coverImage", { length: 255 }),
  seoTitle: varchar("seoTitle", { length: 255 }),
  seoDescription: text("seoDescription"),
  published: boolean("published").default(false).notNull(),
  publishedAt: timestamp("publishedAt", { mode: "date" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  authorId: varchar("authorId", { length: 255 }).notNull().references(() => users.id),
});

// ─── Wishlist ─────────────────────────────────────────────────────

export const wishlistItems = pgTable("WishlistItem", {
  id: varchar("id", { length: 255 }).primaryKey().notNull().default(sql`gen_random_uuid()`),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  userId: varchar("userId", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: varchar("productId", { length: 255 }).notNull().references(() => products.id, { onDelete: "cascade" }),
}, (table) => ({ uniqueUserProduct: unique().on(table.userId, table.productId) }));

// ─── Stock Movements ───────────────────────────────────────────────

export const stockMovements = pgTable("StockMovement", {
  id: varchar("id", { length: 255 }).primaryKey().notNull().default(sql`gen_random_uuid()`),
  quantity: integer("quantity").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  variantId: varchar("variantId", { length: 255 }).notNull().references(() => productVariants.id, { onDelete: "cascade" }),
  userId: varchar("userId", { length: 255 }).references(() => users.id),
});
