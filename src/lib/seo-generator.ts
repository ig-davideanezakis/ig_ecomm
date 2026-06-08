/**
 * Auto-generates SEO fields from product/category data.
 * These are helpers used by the admin forms — the AI suggests, the admin approves.
 */

const STORE_NAME = "Infograf Store";
const MAX_TITLE_LENGTH = 60;
const MAX_DESC_LENGTH = 160;

/**
 * Generate a meta title from a product/category title.
 * Format: "{Title} | Infograf Store"
 * Truncated to ~60 chars if needed.
 */
export function generateMetaTitle(title: string): string {
  const full = `${title} | ${STORE_NAME}`;
  if (full.length <= MAX_TITLE_LENGTH) return full;
  // Truncate the title part to fit "… | Infograf Store"
  const suffix = `… | ${STORE_NAME}`;
  const maxTitlePart = MAX_TITLE_LENGTH - suffix.length;
  return `${title.slice(0, maxTitlePart)}${suffix}`;
}

/**
 * Generate a meta description from a short description text.
 * Truncated to ~160 chars, ending with a clean sentence break.
 */
export function generateMetaDescription(description: string, fallback?: string): string {
  const text = (description || fallback || "").trim();
  if (!text) return `Scopri i prodotti ${STORE_NAME}. Acquista online con spedizione rapida in tutta Italia.`;

  const cleaned = text
    .replace(/<[^>]*>/g, "") // strip HTML
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length <= MAX_DESC_LENGTH) return cleaned;

  // Truncate at the last space before 160 chars
  const truncated = cleaned.slice(0, MAX_DESC_LENGTH);
  const lastSpace = truncated.lastIndexOf(" ");
  return lastSpace > 0 ? `${truncated.slice(0, lastSpace)}…` : `${truncated}…`;
}

/**
 * Generate a complete SEO payload for a product.
 */
export function generateProductSeo(
  title: string,
  description?: string | null,
  category?: string | null,
) {
  const metaTitle = generateMetaTitle(title);
  const descParts = [description, category ? `Nella categoria ${category}` : ""].filter(Boolean);
  const metaDescription = generateMetaDescription(descParts.join(". "));

  return { seoTitle: metaTitle, seoDescription: metaDescription };
}

/**
 * Generate a complete SEO payload for a category.
 */
export function generateCategorySeo(
  name: string,
  description?: string | null,
  parentName?: string | null,
) {
  const metaTitle = generateMetaTitle(name);
  const descParts = [description, parentName ? `Sottocategoria di ${parentName}` : ""].filter(Boolean);
  const metaDescription = generateMetaDescription(descParts.join(". "));

  return { seoTitle: metaTitle, seoDescription: metaDescription };
}
