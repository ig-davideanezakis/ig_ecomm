/**
 * Icecat → product form mapping logic (pure functions, unit-testable).
 *
 * The admin product form used to auto-fill every field returned by the
 * Icecat lookup. This module powers the "choose which sections to import"
 * dialog: it builds the list of importable sections (with previews and
 * sensible defaults) and applies the user's selection to the form state.
 */

import type { IcecatProductData } from "@/lib/icecat";

/** Every importable section of the Icecat lookup result. */
export type IcecatSectionId =
  | "title"
  | "shortDesc"
  | "longDesc"
  | "bulletPoints"
  | "specs"
  | "weight"
  | "images"
  | "brand"
  | "category";

/** Snapshot of the form fields that Icecat data can touch. */
export interface IcecatFormSnapshot {
  title: string;
  description: string;
  content: string;
  specifications: string;
  weight: string;
  brandId: string;
  categoryId: string;
}

export interface IcecatCatalogEntry {
  id: string;
  name: string;
  slug: string;
}

export interface IcecatSection {
  id: IcecatSectionId;
  label: string;
  /** Short human preview shown in the dialog. */
  preview: string;
  /** Set when the target field already has a value (default unchecked). */
  conflict: boolean;
  defaultSelected: boolean;
}

/** Fields to write back into the form after the user confirms. */
export interface IcecatApplyResult {
  title?: string;
  description?: string;
  content?: string;
  /** HTML specs table (dimensions row + FeatureGroups) — dedicated field. */
  specifications?: string;
  weight?: number;
  images?: { url: string; alt: string }[];
  brandId?: string;
  categoryId?: string;
}

const MAX_PREVIEW_CHARS = 110;

export function truncate(text: string, max = MAX_PREVIEW_CHARS): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

/** Escape text before embedding it in HTML content (Icecat is an external source). */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function findBrandMatch(
  brand: string,
  brands: IcecatCatalogEntry[],
): IcecatCatalogEntry | undefined {
  const needle = brand.trim().toLowerCase();
  if (!needle) return undefined;
  return brands.find(
    (b) => b.name.toLowerCase() === needle || b.slug.toLowerCase() === needle,
  );
}

export function findCategoryMatch(
  categoryHint: string | null | undefined,
  categories: IcecatCatalogEntry[],
): IcecatCatalogEntry | undefined {
  if (!categoryHint) return undefined;
  const needle = categoryHint.trim().toLowerCase();
  if (!needle) return undefined;
  return categories.find(
    (c) => c.name.toLowerCase() === needle || c.slug.toLowerCase() === needle,
  );
}

/** Dimension row (L×A×P) added on top of the specs table when available. */
export function buildDimensionsRow(
  dimensions: IcecatProductData["dimensions"] | null | undefined,
): { label: string; value: string } | null {
  if (!dimensions) return null;
  const { width, height, depth } = dimensions;
  const parts = [width, height, depth].map((v) => v.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  return { label: "Dimensioni (L×A×P)", value: parts.join(" × ") };
}

function bulletLines(bulletPoints: string): string[] {
  return bulletPoints.split("\n").map((b) => b.trim()).filter(Boolean);
}

/**
 * Build the list of sections for the chooser dialog.
 *
 * Defaults:
 * - Fields that would overwrite an existing value are unchecked (`conflict`).
 * - Non-destructive additions (bullet points, specs table, gallery images)
 *   are checked by default.
 * - Brand/category are only offered when an exact (case-insensitive) match
 *   exists in the catalog.
 */
export function buildIcecatSections(
  data: IcecatProductData,
  snapshot: IcecatFormSnapshot,
  catalog: { brands: IcecatCatalogEntry[]; categories: IcecatCatalogEntry[] },
): IcecatSection[] {
  const sections: IcecatSection[] = [];

  if (data.title) {
    sections.push({
      id: "title",
      label: "Titolo",
      preview: truncate(data.title),
      conflict: Boolean(snapshot.title),
      defaultSelected: !snapshot.title,
    });
  }

  if (data.shortDesc) {
    sections.push({
      id: "shortDesc",
      label: "Descrizione breve",
      preview: truncate(data.shortDesc),
      conflict: Boolean(snapshot.description),
      defaultSelected: !snapshot.description,
    });
  }

  if (data.longDesc) {
    sections.push({
      id: "longDesc",
      label: "Descrizione lunga",
      preview: truncate(data.longDesc),
      conflict: Boolean(snapshot.content),
      defaultSelected: !snapshot.content,
    });
  }

  const bullets = bulletLines(data.bulletPoints ?? "");
  if (bullets.length > 0) {
    sections.push({
      id: "bulletPoints",
      label: "Punti chiave",
      preview: bullets.length === 1 ? `• ${truncate(bullets[0], 80)}` : `${bullets.length} punti chiave — ${truncate(bullets[0], 60)}…`,
      conflict: false,
      defaultSelected: true,
    });
  }

  const dimRow = buildDimensionsRow(data.dimensions);
  const specCount = data.specs.length + (dimRow ? 1 : 0);
  if (specCount > 0) {
    const firstLabels = data.specs.slice(0, 3).map((s) => s.label).join(" · ");
    sections.push({
      id: "specs",
      label: "Specifiche tecniche",
      preview: `${specCount} specifiche${firstLabels ? ` — ${truncate(firstLabels, 70)}` : ""}`,
      conflict: Boolean(snapshot.specifications),
      defaultSelected: !snapshot.specifications,
    });
  }

  if (data.weight != null) {
    sections.push({
      id: "weight",
      label: "Peso",
      preview: `${data.weight} kg`,
      conflict: Boolean(snapshot.weight),
      defaultSelected: !snapshot.weight,
    });
  }

  if (data.images.length > 0) {
    sections.push({
      id: "images",
      label: "Immagini",
      preview: `${data.images.length} ${data.images.length === 1 ? "immagine" : "immagini"} (copiate su Storage)`,
      conflict: false,
      defaultSelected: true,
    });
  }

  if (findBrandMatch(data.brand, catalog.brands)) {
    sections.push({
      id: "brand",
      label: "Marca",
      preview: data.brand,
      conflict: Boolean(snapshot.brandId),
      defaultSelected: !snapshot.brandId,
    });
  }

  if (findCategoryMatch(data.categoryHint, catalog.categories)) {
    sections.push({
      id: "category",
      label: "Categoria suggerita",
      preview: data.categoryHint,
      conflict: Boolean(snapshot.categoryId),
      defaultSelected: !snapshot.categoryId,
    });
  }

  return sections;
}

/**
 * Apply the selected sections to the form state.
 *
 * Content composition order (only when at least one content section is
 * selected): long description (replaces the current content) → bullet list →
 * specs table (dimensions row first). Sections that are not selected leave
 * their target field untouched (undefined in the result).
 */
export function applyIcecatSelection(
  data: IcecatProductData,
  selected: ReadonlySet<IcecatSectionId>,
  snapshot: IcecatFormSnapshot,
  catalog: { brands: IcecatCatalogEntry[]; categories: IcecatCatalogEntry[] },
): IcecatApplyResult {
  const result: IcecatApplyResult = {};

  if (selected.has("title") && data.title) result.title = data.title;
  if (selected.has("shortDesc") && data.shortDesc) result.description = data.shortDesc;
  if (selected.has("weight") && data.weight != null) result.weight = data.weight;
  if (selected.has("images") && data.images.length > 0) {
    result.images = data.images.map((img) => ({ url: img.url, alt: img.alt || "" }));
  }

  const brand = selected.has("brand") ? findBrandMatch(data.brand, catalog.brands) : undefined;
  if (brand) result.brandId = brand.id;

  const category = selected.has("category")
    ? findCategoryMatch(data.categoryHint, catalog.categories)
    : undefined;
  if (category) result.categoryId = category.id;

  // Content = long description + bullet list only. The specs table lives in
  // its own dedicated field (product.specifications), rendered separately.
  const wantsContent = selected.has("longDesc") || selected.has("bulletPoints");
  if (wantsContent) {
    let content = selected.has("longDesc") && data.longDesc ? data.longDesc : snapshot.content;

    if (selected.has("bulletPoints")) {
      const bullets = bulletLines(data.bulletPoints ?? "");
      if (bullets.length > 0) {
        const lis = bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("");
        content = content ? `${content}\n<ul>${lis}</ul>` : `<ul>${lis}</ul>`;
      }
    }

    result.content = content;
  }

  // Specs → dedicated `specifications` field.
  // Preferred format: structured JSON of the Icecat FeaturesGroups
  // ([{ group, rows: [{ label, value }] }]) — enables grouped rendering on
  // the shop page and future product comparison. Falls back to a flat HTML
  // table when the source has no groups (e.g. legacy/lookup without groups).
  if (selected.has("specs")) {
    const dimRow = buildDimensionsRow(data.dimensions);
    const groups = data.specGroups?.length
      ? data.specGroups
      : [
          {
            group: "",
            rows: [...(dimRow ? [dimRow] : []), ...data.specs.map((s) => ({ label: s.label, value: s.value }))],
          },
        ];

    // Drop empty groups, keep only label+value rows
    const clean = groups
      .map((g) => ({
        group: g.group,
        rows: g.rows.filter((r) => r.label && r.value),
      }))
      .filter((g) => g.rows.length > 0);

    if (clean.length > 0) {
      result.specifications = JSON.stringify(clean);
    }
  }

  return result;
}
