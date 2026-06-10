import { sql } from "drizzle-orm";
import {
  pgTable,
  varchar,
  timestamp,
  integer,
  boolean,
  unique,
} from "drizzle-orm/pg-core";
import { categories } from "./store";

// ─── Filters ──────────────────────────────────────────────────────

export const filters = pgTable("filter", {
  id: varchar("id", { length: 255 }).primaryKey().notNull().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  type: varchar("type", { length: 50 }).notNull().default("checkbox"),
  isGlobal: boolean("is_global").default(false).notNull(),
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

// ─── Product-Filter values (dynamic values stored per product) ────

export const productFilterValues = pgTable("product_filter_value", {
  id: varchar("id", { length: 255 }).primaryKey().notNull().default(sql`gen_random_uuid()`),
  productId: varchar("product_id", { length: 255 }).notNull(),
  filterId: varchar("filter_id", { length: 255 }).notNull().references(() => filters.id, { onDelete: "cascade" }),
  value: varchar("value", { length: 255 }).notNull(),
  filterOptionId: varchar("filter_option_id", { length: 255 }).references(() => filterOptions.id, { onDelete: "cascade" }),
}, (table) => ({
  uniqueProductFilter: unique().on(table.productId, table.filterId, table.value),
}));
