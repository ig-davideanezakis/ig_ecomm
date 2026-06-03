import { sql } from "drizzle-orm";
import {
  pgTable,
  varchar,
  timestamp,
  text,
  integer,
  boolean,
  primaryKey,
} from "drizzle-orm/pg-core";

// ─── Auth (NextAuth.js v5 / Auth.js) — all snake_case ────────────
export const users = pgTable("user", {
  id: varchar("id", { length: 255 })
    .primaryKey()
    .notNull()
    .default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: varchar("image", { length: 255 }),
  // Role: CUSTOMER (default), STAFF, ADMIN
  role: varchar("role", { length: 20 }).default("CUSTOMER").notNull(),
  phone: varchar("phone", { length: 50 }),
  // 2FA / TOTP fields
  totpSecret: text("totp_secret"),
  totpEnabled: boolean("totp_enabled").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const accounts = pgTable(
  "account",
  {
    userId: varchar("userId", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 255 }).notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("providerAccountId", { length: 255 }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: varchar("token_type", { length: 255 }),
    scope: varchar("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: varchar("session_state", { length: 255 }),
  },
  (table) => ({
    compoundKey: primaryKey({ columns: [table.provider, table.providerAccountId] }),
  }),
);

export const sessions = pgTable("session", {
  sessionToken: varchar("sessionToken", { length: 255 }).primaryKey().notNull(),
  userId: varchar("userId", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_token",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull().unique(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => ({
    compoundKey: primaryKey({ columns: [table.identifier, table.token] }),
  }),
);

export type UserRole = "GUEST" | "CUSTOMER" | "STAFF" | "ADMIN";
