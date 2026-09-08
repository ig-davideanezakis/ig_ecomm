/**
 * Filter values — the single derivation engine behind "auto" filters.
 *
 * A filter with `valueMode: "auto"` gets its per-product value derived from
 * `product.specifications` (Icecat grouped JSON:
 * `[{ group, rows: [{ label, value }] }]`) via `patterns`/`exclude`
 * substring matching against the normalized row label — the exact
 * mechanism the (now-retired) spec-chips config used. The derived value is
 * persisted into `product_filter_value` by `syncAutoFilterValues` whenever
 * a product's specifications change, rather than re-parsed on every page
 * render. It doubles as the filter's chip value when `showAsChip` is true
 * and/or its shop-filter value when `useAsFilter` is true — same row, two
 * uses.
 *
 * A filter with `valueMode: "manual"` is unaffected by any of this: its
 * `product_filter_value` rows are set directly (product form / admin), not
 * derived.
 */

// ─── Normalization ────────────────────────────────────────────────

/**
 * Lowercase, strip diacritics and punctuation, collapse whitespace —
 * so "Scheda grafica dedicata", "Dimensioni dello schermo" etc. compare
 * reliably regardless of accents/spacing variants.
 */
export function normalizeSpecLabel(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Types ────────────────────────────────────────────────────────

export interface AutoFilterConfig {
  /** filter.id — the map key in extractFilterValues' return value. */
  id: string;
  /** Normalized label substrings, in priority order (first match wins). */
  patterns: string[];
  /** Optional substrings that disqualify a row (e.g. "frequenza"). */
  exclude?: string[];
}

interface SpecRowLike {
  label: string;
  value: string;
}

// ─── Extraction ───────────────────────────────────────────────────

function parseSpecRows(specifications: string | null | undefined): SpecRowLike[] {
  if (!specifications || !specifications.trim()) return [];

  const trimmed = specifications.trim();
  if (!trimmed.startsWith("[")) return []; // legacy HTML → no structured rows

  let groups: Array<{ rows?: unknown }> | null = null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) groups = parsed as Array<{ rows?: unknown }>;
  } catch {
    return [];
  }
  if (!groups) return [];

  const rows: SpecRowLike[] = [];
  for (const group of groups) {
    if (!group || !Array.isArray(group.rows)) continue;
    for (const row of group.rows) {
      const r = row as SpecRowLike;
      if (r && typeof r.label === "string" && typeof r.value === "string" && r.label.trim() && r.value.trim()) {
        rows.push({ label: r.label, value: r.value.replace(/\s+/g, " ").trim() });
      }
    }
  }
  return rows;
}

/**
 * Extract every configured auto-filter's value from a product's
 * specifications JSON, in one pass so filters never fight over the same
 * row: each row can feed at most one filter (first filter in `configs`
 * order wins), matching the previous spec-chips behavior exactly.
 *
 * Returns a Map keyed by `AutoFilterConfig.id`; a filter with no match is
 * simply absent from the map (never an empty-string entry).
 */
export function extractFilterValues(
  specifications: string | null | undefined,
  configs: AutoFilterConfig[],
): Map<string, string> {
  const result = new Map<string, string>();
  if (configs.length === 0) return result;

  const rows = parseSpecRows(specifications);
  if (rows.length === 0) return result;

  const rowTaken = new Array(rows.length).fill(false);
  const normalizedLabels = rows.map((r) => normalizeSpecLabel(r.label));

  for (const config of configs) {
    const exclude = config.exclude?.map(normalizeSpecLabel) ?? [];
    let chosen: SpecRowLike | null = null;

    for (const pattern of config.patterns) {
      const norm = normalizeSpecLabel(pattern);
      if (!norm) continue;
      for (let i = 0; i < rows.length; i++) {
        if (rowTaken[i]) continue;
        const label = normalizedLabels[i];
        if (label.includes(norm)) {
          if (exclude.some((ex) => ex && label.includes(ex))) continue;
          chosen = rows[i];
          rowTaken[i] = true;
          break;
        }
      }
      if (chosen) break;
    }

    if (chosen) result.set(config.id, chosen.value);
  }

  return result;
}

/** Single-filter convenience wrapper over extractFilterValues. */
export function extractFilterValue(
  specifications: string | null | undefined,
  config: Omit<AutoFilterConfig, "id">,
): string | null {
  const values = extractFilterValues(specifications, [
    { patterns: config.patterns, exclude: config.exclude, id: "_" },
  ]);
  return values.get("_") ?? null;
}

// ─── Chip rendering (showAsChip filters) ─────────────────────────

export interface ChipFilterConfig extends AutoFilterConfig {
  label: string;
  icon: string;
}

export interface ChipValue {
  id: string;
  label: string;
  icon: string;
  value: string;
}

/**
 * Compact icon+value pills for product cards/PDP — same derivation as
 * extractFilterValues, reshaped into display data and returned in
 * *config* order (not document order), matching the previous spec-chips
 * behavior.
 */
export function extractChipValues(
  specifications: string | null | undefined,
  configs: ChipFilterConfig[],
): ChipValue[] {
  const values = extractFilterValues(specifications, configs);
  const result: ChipValue[] = [];
  for (const config of configs) {
    const value = values.get(config.id);
    if (value) result.push({ id: config.id, label: config.label, icon: config.icon, value });
  }
  return result;
}

// ─── Config parsing (filter.patterns / filter.exclude JSON columns) ──

/** Parse a `filter.patterns`/`filter.exclude` JSON-string-array column. */
export function parseTokenArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

// ─── Write-time sync ──────────────────────────────────────────────

/** The subset of `pg.Pool`/`pg.PoolClient` this module needs — lets callers
 * pass either, so the sync can run inside an existing transaction. */
interface Queryable {
  query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}

/**
 * Recompute every "auto" filter's value for one product from its current
 * specifications, and persist the result into `product_filter_value` — the
 * durable store both chip display and shop filtering read from.
 *
 * A filter whose current row has `isOverride = true` (an admin correction
 * made from the product form) is left untouched: re-derivation must never
 * clobber a manual fix.
 *
 * Call this whenever `product.specifications` changes: product create,
 * product update, Icecat import. Pass the transaction's `client` when
 * called from inside one, so the sync is atomic with the write that
 * triggered it.
 */
export async function syncAutoFilterValues(
  db: Queryable,
  productId: string,
  specifications: string | null | undefined,
): Promise<void> {
  const filtersResult = await db.query(
    `SELECT id, patterns, exclude FROM "filter" WHERE value_mode = 'auto'`,
  );
  if (filtersResult.rows.length === 0) return;

  const configs: AutoFilterConfig[] = filtersResult.rows
    .map((f) => ({
      id: f.id as string,
      patterns: parseTokenArray(f.patterns as string | null),
      exclude: parseTokenArray(f.exclude as string | null),
    }))
    .filter((c) => c.patterns.length > 0);
  if (configs.length === 0) return;

  const derived = extractFilterValues(specifications, configs);
  const filterIds = configs.map((c) => c.id);

  const overriddenResult = await db.query(
    `SELECT filter_id FROM "product_filter_value" WHERE product_id = $1 AND is_override = true AND filter_id = ANY($2)`,
    [productId, filterIds],
  );
  const overriddenIds = new Set(overriddenResult.rows.map((r) => r.filter_id as string));

  const writableFilterIds = filterIds.filter((id) => !overriddenIds.has(id));
  if (writableFilterIds.length === 0) return;

  await db.query(
    `DELETE FROM "product_filter_value" WHERE product_id = $1 AND filter_id = ANY($2) AND is_override = false`,
    [productId, writableFilterIds],
  );

  for (const filterId of writableFilterIds) {
    const value = derived.get(filterId);
    if (!value) continue;
    await db.query(
      `INSERT INTO "product_filter_value" (product_id, filter_id, value) VALUES ($1, $2, $3)`,
      [productId, filterId, value],
    );
  }
}
