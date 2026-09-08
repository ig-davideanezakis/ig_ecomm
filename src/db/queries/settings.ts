import { pool } from "@/lib/db";
import {
  DEFAULT_SPEC_CHIPS,
  parseSpecChipsConfig,
  type SpecChipConfig,
} from "@/lib/spec-chips";
import { parseTokenArray, type ChipFilterConfig } from "@/lib/filter-values";
import {
  DEFAULT_INFO_TABS,
  type ProductInfoTabs,
} from "@/lib/product-tabs";

// ─── Spec chips configuration (store_setting key "spec_chips") ────
//
// Deprecated — superseded by getChipFilterConfigs() below, which reads the
// unified `filter` table (showAsChip) instead of this store_setting blob.
// Kept only until the admin settings-page chip editor is retired (it still
// reads/writes this key) and every `spec_chips` value has been migrated to
// `filter` rows via scripts/migrate-spec-chips-to-filters.ts.

/**
 * Load the admin-configured spec chip definitions.
 * Falls back to the built-in defaults (CPU, RAM, storage, display, GPU, OS)
 * while no `spec_chips` setting has been saved yet.
 */
export async function getSpecChipsConfig(): Promise<SpecChipConfig[]> {
  const result = await pool.query(
    `SELECT value FROM store_setting WHERE key = 'spec_chips'`,
  );
  const parsed = parseSpecChipsConfig(result.rows[0]?.value ?? null);
  return parsed ?? DEFAULT_SPEC_CHIPS;
}

// ─── Chip filters (unified `filter` table, showAsChip = true) ─────

/**
 * Load every "auto" filter configured to render as a compact icon+value
 * chip on product cards and the PDP, in display order. Values are derived
 * per product from `product.specifications` via extractChipValues().
 */
export async function getChipFilterConfigs(): Promise<ChipFilterConfig[]> {
  const result = await pool.query(
    `SELECT id, name, icon, patterns, exclude FROM "filter"
     WHERE show_as_chip = true AND value_mode = 'auto'
     ORDER BY sort_order ASC`,
  );
  return result.rows
    .map((r) => ({
      id: r.id as string,
      label: r.name as string,
      icon: (r.icon as string | null) || "tag",
      patterns: parseTokenArray(r.patterns as string | null),
      exclude: parseTokenArray(r.exclude as string | null),
    }))
    .filter((c) => c.patterns.length > 0);
}

// ─── Product info tabs (store-wide content, admin-editable) ───────

const INFO_TAB_KEYS = [
  "product_tab_come_acquista",
  "product_tab_garanzia",
  "product_tab_recesso",
] as const;

/**
 * Load the content for the "Come acquista / Garanzia / Recesso" product tabs.
 * Falls back to the built-in defaults while a setting is empty or missing.
 */
export async function getProductInfoTabs(): Promise<ProductInfoTabs> {
  const result = await pool.query(
    `SELECT key, value FROM store_setting WHERE key = ANY($1::text[])`,
    [INFO_TAB_KEYS],
  );
  const values: Record<string, string> = {};
  for (const row of result.rows) values[row.key] = row.value;

  return {
    howToBuy: values.product_tab_come_acquista || DEFAULT_INFO_TABS.howToBuy,
    warranty: values.product_tab_garanzia || DEFAULT_INFO_TABS.warranty,
    withdrawal: values.product_tab_recesso || DEFAULT_INFO_TABS.withdrawal,
  };
}
