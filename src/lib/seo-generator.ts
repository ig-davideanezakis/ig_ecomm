/**
 * Client-side SEO helpers for form preview.
 * The actual generation is done server-side via DeepSeek API.
 */

const STORE_NAME = "Infograf Store";
const MAX_TITLE_LENGTH = 60;
const MAX_DESC_LENGTH = 160;

/**
 * Preview a meta title format (client-side estimation).
 */
export function previewMetaTitle(title: string): string {
  const full = `${title} | ${STORE_NAME}`;
  if (full.length <= MAX_TITLE_LENGTH) return full;
  const suffix = `… | ${STORE_NAME}`;
  const maxTitlePart = MAX_TITLE_LENGTH - suffix.length;
  return `${title.slice(0, maxTitlePart)}${suffix}`;
}

/**
 * Preview a meta description (client-side estimation).
 */
export function previewMetaDescription(text: string): string {
  const cleaned = text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  if (!cleaned) return `Scopri i prodotti ${STORE_NAME}.`;
  if (cleaned.length <= MAX_DESC_LENGTH) return cleaned;
  const truncated = cleaned.slice(0, MAX_DESC_LENGTH);
  const lastSpace = truncated.lastIndexOf(" ");
  return lastSpace > 0 ? `${truncated.slice(0, lastSpace)}…` : `${truncated}…`;
}
