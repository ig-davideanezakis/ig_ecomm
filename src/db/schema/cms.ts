import { sql } from "drizzle-orm";
import { pgTable, varchar, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";

// ─── Store Settings (key-value store for footer, contacts, etc.) ──
export const storeSettings = pgTable("store_setting", {
  key: varchar("key", { length: 255 }).primaryKey().notNull(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Static Pages (Chi siamo, FAQ, Privacy, etc.) ─────────────────
export const pages = pgTable("page", {
  id: varchar("id", { length: 255 }).primaryKey().notNull().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  published: boolean("published").default(true).notNull(),
  showInFooter: boolean("show_in_footer").default(false).notNull(),
  showInNav: boolean("show_in_nav").default(false).notNull(),
  navOrder: integer("nav_order").default(0).notNull(),
  footerOrder: integer("footer_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
