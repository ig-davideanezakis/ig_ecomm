/**
 * Spec "chips" — highlighted product characteristics rendered as compact
 * icon+value pills on product cards (list/search) and on the product detail
 * page.
 *
 * Chips are NOT stored per product: they are derived at render time from the
 * Icecat grouped specifications (product.specifications, JSON array of
 * { group, rows: [{ label, value }] }) using a global, admin-editable
 * configuration stored in the store_setting key-value table under the key
 * `spec_chips` (see the Admin → Impostazioni editor).
 *
 * A configuration entry describes how to recognize one characteristic inside
 * the Icecat rows:
 *   - `patterns`: substrings matched against the normalized row label, tried
 *     in order; the FIRST product row containing the current pattern wins
 *     (so "Famiglia processore" beats the generic "processore" row).
 *   - `exclude`:   optional normalized substrings that disqualify a row
 *     ("Frequenza del processore" must never feed the CPU chip).
 *
 * Matching rules:
 *   - rows are scanned in document order (group by group);
 *   - each row can feed at most one chip (first chip in config order wins);
 *   - chip values are shown as-is (trimmed/collapsed), no unit guessing.
 *
 * Legacy HTML specifications (pre-Icecat imports) produce no chips.
 */

// ─── Types ────────────────────────────────────────────────────────

export interface SpecChipConfig {
  /** Stable identifier (used as React key). */
  id: string;
  /** Human label shown next to the value on the detail page. */
  label: string;
  /** Curated icon key — resolved by <SpecChipIcon> (fallback icon when unknown). */
  icon: string;
  /** Normalized label substrings, in priority order (first match wins). */
  patterns: string[];
  /** Optional substrings that disqualify a row (e.g. "frequenza"). */
  exclude?: string[];
}

export interface SpecChipValue {
  id: string;
  label: string;
  icon: string;
  value: string;
}

// ─── Defaults ─────────────────────────────────────────────────────
//
// Used when no `spec_chips` setting exists yet, so the shop works out of
// the box. Labels/patterns are grounded in real Icecat IT imports
// (Notebook/Desktop/console samples): "Famiglia processore", "RAM
// installata", "Capacità memoria interna/integrata", "Dimensioni diagonale
// schermo", "Processore grafico", "Sistema operativo incluso".

export const DEFAULT_SPEC_CHIPS: SpecChipConfig[] = [
  {
    id: "cpu",
    label: "CPU",
    icon: "cpu",
    patterns: [
      "famiglia processore",
      "famiglia del processore",
      "modello del processore",
      "processore installato",
      "processore",
    ],
    exclude: [
      "frequenza",
      "produttore",
      "generazione",
      "numero di core",
      "numero di threads",
      "cache",
      "litografia",
      "nome in codice",
    ],
  },
  {
    id: "ram",
    label: "RAM",
    icon: "memory-stick",
    patterns: ["ram installata", "memoria ram installata", "memoria ad accesso casuale"],
  },
  {
    id: "storage",
    label: "Archiviazione",
    icon: "hard-drive",
    patterns: [
      "capacità memoria interna",
      "capacità memoria integrata",
      "capacità totale di archiviazione",
      "capacità disco rigido",
      "capacità ssd",
      "memoria interna",
    ],
    exclude: ["espandibile", "massima"],
  },
  {
    id: "display",
    label: "Schermo",
    icon: "monitor",
    patterns: [
      "dimensioni diagonale schermo",
      "dimensioni dello schermo",
      "dimensioni schermo",
      "diagonale dello schermo",
      "diagonale del display",
      "dimensioni del display",
      "dimensioni display",
    ],
  },
  {
    id: "gpu",
    label: "Scheda video",
    icon: "gpu",
    patterns: [
      "modello scheda grafica",
      "scheda grafica dedicata",
      "processore grafico dedicato",
      "adattatore grafico dedicato",
      "modello adattatore grafico",
      "processore grafico",
      "scheda grafica",
      "adattatore grafico",
    ],
    exclude: ["frequenza", "produttore", "fornitore", "tipo di", "memoria"],
  },
  {
    id: "os",
    label: "Sistema operativo",
    icon: "app-window",
    patterns: [
      "sistema operativo incluso",
      "sistema operativo installato",
      "sistema operativo fornito",
      "sistema operativo",
    ],
    exclude: ["versione", "famiglia"],
  },
];

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
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Config parsing (admin-stored JSON) ──────────────────────────

function toCleanTokens(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const out: string[] = [];
  for (const v of values) {
    const clean = normalizeSpecLabel(typeof v === "string" ? v : "");
    if (clean && !out.includes(clean)) out.push(clean);
  }
  return out;
}

/**
 * Parse the stored `spec_chips` JSON into a valid config array.
 * Returns null when the key is absent/empty/malformed → callers fall back
 * to DEFAULT_SPEC_CHIPS. An explicit `[]` (valid, empty array) is kept and
 * means "chips disabled".
 */
export function parseSpecChipsConfig(raw: string | null | undefined): SpecChipConfig[] | null {
  if (!raw || !raw.trim()) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;

  const chips: SpecChipConfig[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue;
    const obj = entry as Record<string, unknown>;
    const patterns = toCleanTokens(obj.patterns);
    if (patterns.length === 0) continue;

    const label = typeof obj.label === "string" ? obj.label.trim() : "";
    const icon = typeof obj.icon === "string" && obj.icon.trim() ? obj.icon.trim() : "tag";
    let id = typeof obj.id === "string" && obj.id.trim() ? obj.id.trim() : "";
    if (!id) id = label ? normalizeSpecLabel(label).replace(/\s+/g, "-") : `chip-${chips.length}`;

    const exclude = toCleanTokens(obj.exclude);
    chips.push({ id, label: label || patterns[0], icon, patterns, ...(exclude.length ? { exclude } : {}) });
  }
  return chips;
}

// ─── Extraction ───────────────────────────────────────────────────

interface SpecRowLike {
  label: string;
  value: string;
}

/**
 * Extract the configured chips present in a product's specifications JSON.
 * Returns [] for legacy HTML specs or when nothing matches.
 */
export function extractSpecChips(
  specifications: string | null | undefined,
  config: SpecChipConfig[],
): SpecChipValue[] {
  if (!specifications || !specifications.trim() || config.length === 0) return [];

  const trimmed = specifications.trim();
  if (!trimmed.startsWith("[")) return []; // legacy HTML → no structured chips

  let groups: Array<{ rows?: unknown }> | null = null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) groups = parsed as Array<{ rows?: unknown }>;
  } catch {
    return [];
  }
  if (!groups) return [];

  // Flatten rows in document order, keeping only label+value pairs.
  const rows: Array<{ label: string; value: string }> = [];
  for (const group of groups) {
    if (!group || !Array.isArray(group.rows)) continue;
    for (const row of group.rows) {
      const r = row as SpecRowLike;
      if (r && typeof r.label === "string" && typeof r.value === "string" && r.label.trim() && r.value.trim()) {
        rows.push({ label: r.label, value: r.value.replace(/\s+/g, " ").trim() });
      }
    }
  }
  if (rows.length === 0) return [];

  const rowTaken = new Array(rows.length).fill(false);
  const normalizedLabels = rows.map((r) => normalizeSpecLabel(r.label));
  const chips: SpecChipValue[] = [];

  for (const chip of config) {
    const exclude = chip.exclude?.map(normalizeSpecLabel) ?? [];
    let chosen: SpecRowLike | null = null;

    for (const pattern of chip.patterns) {
      const norm = normalizeSpecLabel(pattern);
      if (!norm) continue;
      for (let i = 0; i < rows.length; i++) {
        if (rowTaken[i]) continue;
        const label = normalizedLabels[i];
        if (norm && label.includes(norm)) {
          if (exclude.some((ex) => ex && label.includes(ex))) continue;
          chosen = rows[i];
          rowTaken[i] = true;
          break;
        }
      }
      if (chosen) break;
    }

    if (chosen) {
      chips.push({ id: chip.id, label: chip.label, icon: chip.icon, value: chosen.value });
    }
  }

  return chips;
}
