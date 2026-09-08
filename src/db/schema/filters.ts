import { sql } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  unique,
} from "drizzle-orm/pg-core";
import { categories, products } from "./store";

// ─── Filters ──────────────────────────────────────────────────────
//
// A filter can be shown as a spec "chip" (compact icon+value pill on
// product cards/PDP), used as a shop sidebar filter, or both — see
// `valueMode` below and docs/guides/filters.md.

export const filters = pgTable("filter", {
  id: varchar("id", { length: 255 }).primaryKey().notNull().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  type: varchar("type", { length: 50 }).notNull().default("checkbox"),
  /**
   * "auto": value is derived per product from `product.specifications`
   * (Icecat JSON) via `patterns`/`exclude` — see src/lib/filter-values.ts.
   * "manual": value is a curated pick from `filter_option`, assigned per
   * product in `product_filter_value` (no auto-derivation).
   */
  valueMode: varchar("value_mode", { length: 20 }).notNull().default("manual"),
  /** Lucide icon key, used when showAsChip is true (SpecChipIcon fallback: "tag"). */
  icon: varchar("icon", { length: 50 }),
  /** JSON string array — normalized label substrings tried in priority order (valueMode "auto"). */
  patterns: text("patterns"),
  /** JSON string array — substrings that disqualify a row (valueMode "auto"). */
  exclude: text("exclude"),
  /** Render as a compact icon+value pill on product cards and the PDP. */
  showAsChip: boolean("show_as_chip").default(false).notNull(),
  /** Expose as a queryable shop sidebar filter (f_<slug>=value). */
  useAsFilter: boolean("use_as_filter").default(true).notNull(),
  isGlobal: boolean("is_global").default(false).notNull(),
  isSystem: boolean("is_system").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const filterOptions = pgTable("filter_option", {
  id: varchar("id", { length: 255 }).primaryKey().notNull().default(sql`gen_random_uuid()`),
  value: varchar("value", { length: 255 }).notNull(),
  label: varchar("label", { length: 255 }),
  slug: varchar("slug", { length: 255 }),
  color: varchar("color", { length: 50 }),
  sortOrder: integer("sort_order").default(0).notNull(),
  filterId: varchar("filter_id", { length: 255 }).notNull().references(() => filters.id, { onDelete: "cascade" }),
});

export const categoryFilters = pgTable("category_filter", {
  id: varchar("id", { length: 255 }).primaryKey().notNull().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id", { length: 255 }).notNull().references(() => categories.id, { onDelete: "cascade" }),
  filterId: varchar("filter_id", { length: 255 }).notNull().references(() => filters.id, { onDelete: "cascade" }),
  inherit: boolean("inherit").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
}, (table) => ({
  uniqueCategoryFilter: unique().on(table.categoryId, table.filterId),
}));

// ─── Product-Filter values (per-product value, auto-derived or manual) ──
//
// The single durable store for every filter's per-product value. For
// valueMode "auto" filters this row is (re)computed whenever
// `product.specifications` changes (see syncAutoFilterValues in
// src/lib/filter-values.ts) — unless isOverride is true, meaning an admin
// corrected it by hand from the product form and re-derivation must not
// clobber it. For valueMode "manual" filters, this row IS the assignment
// (set directly from the product form, no derivation involved).

export const productFilterValues = pgTable("product_filter_value", {
  id: varchar("id", { length: 255 }).primaryKey().notNull().default(sql`gen_random_uuid()`),
  productId: varchar("product_id", { length: 255 }).notNull().references(() => products.id, { onDelete: "cascade" }),
  filterId: varchar("filter_id", { length: 255 }).notNull().references(() => filters.id, { onDelete: "cascade" }),
  value: varchar("value", { length: 255 }).notNull(),
  filterOptionId: varchar("filter_option_id", { length: 255 }).references(() => filterOptions.id, { onDelete: "cascade" }),
  /** True when an admin manually set/corrected this value from the product form (auto filters only). */
  isOverride: boolean("is_override").default(false).notNull(),
}, (table) => ({
  // A filter can hold more than one value per product (checkbox/color
  // manual filters — e.g. "available in: black, silver"). Auto-mode
  // filters only ever have one current value; syncAutoFilterValues
  // enforces that by deleting the previous non-override row before
  // inserting the freshly derived one, rather than relying on this
  // constraint to collapse them.
  uniqueProductFilter: unique().on(table.productId, table.filterId, table.value),
}));
