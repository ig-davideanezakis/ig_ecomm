import { pool } from "@/lib/db";
import {
  DEFAULT_SPEC_CHIPS,
  parseSpecChipsConfig,
  type SpecChipConfig,
} from "@/lib/spec-chips";

// ─── Spec chips configuration (store_setting key "spec_chips") ────

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
