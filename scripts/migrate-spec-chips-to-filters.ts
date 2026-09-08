import { config } from "dotenv";
import { resolve } from "path";

// Load .env from project root
config({ path: resolve(__dirname, "../.env") });

import { Pool } from "pg";
import { syncAutoFilterValues } from "../src/lib/filter-values";

// ─── Legacy spec_chips format (retired — inlined here since this script's
// whole job is reading it one last time) ───────────────────────────────

interface LegacyChip {
  id: string;
  label: string;
  icon: string;
  patterns: string[];
  exclude?: string[];
}

const DEFAULT_SPEC_CHIPS: LegacyChip[] = [
  { id: "cpu", label: "CPU", icon: "cpu", patterns: [
    "famiglia processore", "famiglia del processore", "modello del processore",
    "processore installato", "processore",
  ], exclude: ["frequenza", "produttore", "generazione", "numero di core", "numero di threads", "cache", "litografia", "nome in codice"] },
  { id: "ram", label: "RAM", icon: "memory-stick", patterns: ["ram installata", "memoria ram installata", "memoria ad accesso casuale"] },
  { id: "storage", label: "Archiviazione", icon: "hard-drive", patterns: [
    "capacità memoria interna", "capacità memoria integrata", "capacità totale di archiviazione",
    "capacità disco rigido", "capacità ssd", "memoria interna",
  ], exclude: ["espandibile", "massima"] },
  { id: "display", label: "Schermo", icon: "monitor", patterns: [
    "dimensioni diagonale schermo", "dimensioni dello schermo", "dimensioni schermo",
    "diagonale dello schermo", "diagonale del display", "dimensioni del display", "dimensioni display",
  ] },
  { id: "gpu", label: "Scheda video", icon: "gpu", patterns: [
    "modello scheda grafica", "scheda grafica dedicata", "processore grafico dedicato",
    "adattatore grafico dedicato", "modello adattatore grafico", "processore grafico",
    "scheda grafica", "adattatore grafico",
  ], exclude: ["frequenza", "produttore", "fornitore", "tipo di", "memoria"] },
  { id: "os", label: "Sistema operativo", icon: "app-window", patterns: [
    "sistema operativo incluso", "sistema operativo installato", "sistema operativo fornito", "sistema operativo",
  ], exclude: ["versione", "famiglia"] },
];

function parseSpecChipsConfig(raw: string | null | undefined): LegacyChip[] | null {
  if (!raw || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (c): c is LegacyChip => c && typeof c === "object" && Array.isArray(c.patterns) && c.patterns.length > 0,
    );
  } catch {
    return null;
  }
}

/**
 * One-time migration: copies the legacy `store_setting.spec_chips` config
 * (or the built-in defaults, if none was ever saved) into real `filter`
 * rows (valueMode "auto", showAsChip + useAsFilter true), then backfills
 * `product_filter_value` for every existing product so filtering/chips
 * work immediately — without waiting for a re-import.
 *
 * Idempotent: a chip whose slug already exists as a filter is skipped
 * (logged), never overwritten.
 *
 * Usage:
 *   npx tsx scripts/migrate-spec-chips-to-filters.ts          # apply
 *   DRY_RUN=1 npx tsx scripts/migrate-spec-chips-to-filters.ts # preview only
 */

const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log(`Starting spec-chips -> filters migration (dry-run: ${DRY_RUN})`);

  const settingResult = await pool.query(
    `SELECT value FROM store_setting WHERE key = 'spec_chips'`,
  );
  const chips = parseSpecChipsConfig(settingResult.rows[0]?.value ?? null) ?? DEFAULT_SPEC_CHIPS;
  console.log(`  Found ${chips.length} chip definition(s) to migrate.`);

  let created = 0, skipped = 0;

  for (let i = 0; i < chips.length; i++) {
    const chip = chips[i];
    const existing = await pool.query(`SELECT id FROM "filter" WHERE slug = $1`, [chip.id]);
    if (existing.rows.length > 0) {
      console.log(`  - skip "${chip.id}" (a filter with this slug already exists)`);
      skipped++;
      continue;
    }

    console.log(`  ${DRY_RUN ? "[dry-run] would create" : "+ creating"} filter "${chip.id}" (${chip.label})`);
    created++;
    if (DRY_RUN) continue;

    await pool.query(
      `INSERT INTO "filter" (name, slug, type, value_mode, icon, patterns, exclude,
         show_as_chip, use_as_filter, is_global, sort_order)
       VALUES ($1, $2, 'checkbox', 'auto', $3, $4, $5, true, true, true, $6)`,
      [chip.label, chip.id, chip.icon, JSON.stringify(chip.patterns),
        JSON.stringify(chip.exclude ?? []), i],
    );
  }

  console.log(`Filters: ${created} created, ${skipped} skipped.`);

  if (DRY_RUN) {
    console.log("Dry run — skipping product_filter_value backfill.");
    await pool.end();
    return;
  }

  const products = await pool.query(`SELECT id, specifications FROM "product"`);
  console.log(`Backfilling product_filter_value for ${products.rows.length} product(s)...`);

  let done = 0;
  for (const p of products.rows) {
    await syncAutoFilterValues(pool, p.id, p.specifications);
    done++;
    if (done % 50 === 0) console.log(`  ...${done}/${products.rows.length}`);
  }

  console.log(`Done. Backfilled ${done} product(s).`);
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
