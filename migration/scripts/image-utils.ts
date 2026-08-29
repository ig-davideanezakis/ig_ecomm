/**
 * Image migration helpers — pure functions for the PrestaShop → ig_ecomm image migration.
 * Kept free of I/O so they can be unit-tested in isolation.
 */

/**
 * Builds the PrestaShop product image file path from an image id.
 * Rule (verified live on www.infografstore.it): every digit of the id becomes
 * a subfolder, then the filename is `{id}.jpg`.
 *
 * Examples:
 *   1320  → "1/3/2/0/1320.jpg"
 *   15658 → "1/5/6/5/8/15658.jpg"
 */
export function prestashopImagePath(id: number | string): string {
  const str = String(id);
  const folders = str.split("").join("/");
  return `${folders}/${str}.jpg`;
}

/**
 * Full URL of an original (non-suffixed) product image on the old store.
 */
export function prestashopImageUrl(baseUrl: string, id: number | string): string {
  return `${baseUrl.replace(/\/$/, "")}/img/p/${prestashopImagePath(id)}`;
}

/**
 * Full URL of a category image (flat path, no digit folders).
 */
export function prestashopCategoryImageUrl(baseUrl: string, id: number | string): string {
  return `${baseUrl.replace(/\/$/, "")}/img/c/${id}.jpg`;
}

/**
 * Full URL of a manufacturer (brand) logo (flat path).
 */
export function prestashopBrandImageUrl(baseUrl: string, id: number | string): string {
  return `${baseUrl.replace(/\/$/, "")}/img/m/${id}.jpg`;
}

/**
 * Full URL of the store logo.
 */
export function prestashopLogoUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/img/logo.jpg`;
}

/**
 * Extracts every distinct absolute image URL under /img/ from an HTML string.
 * Used to discover which CMS/banner images are referenced by migrated content.
 */
export function extractImgUrls(html: string, baseUrl?: string): string[] {
  if (!html) return [];
  const pattern =
    baseUrl && baseUrl.length > 0
      ? new RegExp(`https?:\\/\\/${escapeRegExp(baseUrl.replace(/^https?:\/\//, "").replace(/\/$/, ""))}\\/img\\/[a-zA-Z0-9/._-]+`, "g")
      : /https?:\/\/[a-zA-Z0-9.-]+\/img\/[a-zA-Z0-9/._-]+/g;
  const matches = html.match(pattern) || [];
  return Array.from(new Set(matches)).filter((u) => !u.endsWith("/"));
}

/**
 * Rewrites old image URLs to their new Supabase URLs inside HTML content.
 * Only URLs present in `urlMap` are replaced; everything else is left untouched.
 */
export function rewriteImgUrls(html: string, urlMap: Map<string, string>): string {
  if (!html) return "";
  if (urlMap.size === 0) return html;
  let out = html;
  for (const [oldUrl, newUrl] of urlMap) {
    out = out.split(oldUrl).join(newUrl);
  }
  return out;
}

/**
 * Computes cover-first sort orders for a product's images.
 * PrestaShop marks the default image with `cover = 1` independently of its
 * `position` (in this store 432/1000 covers are NOT at position 1). The migrated
 * `product_image.sort_order` must therefore put the cover image first, then the
 * remaining images in position order.
 *
 * Input: array of { id, position, cover } (cover: 1|0|null)
 * Output: Map<imageId, sortOrder> where the cover image gets 0.
 */
export function computeCoverFirstSortOrders(
  images: Array<{ id: number | string; position: number; cover: number | null }>
): Map<number | string, number> {
  const result = new Map<number | string, number>();
  const sorted = [...images].sort((a, b) => {
    // cover first, then position ascending
    const aCover = a.cover === 1 ? 0 : 1;
    const bCover = b.cover === 1 ? 0 : 1;
    if (aCover !== bCover) return aCover - bCover;
    return (a.position ?? 0) - (b.position ?? 0);
  });
  sorted.forEach((img, index) => {
    result.set(img.id, index);
  });
  return result;
}

/**
 * Storage path in the Supabase bucket for a product image.
 */
export function storagePathForProduct(productId: number | string, imageId: number | string): string {
  return `products/${productId}/${imageId}.jpg`;
}

/**
 * Storage path in the Supabase bucket for a category image.
 */
export function storagePathForCategory(categoryId: number | string): string {
  return `categories/${categoryId}.jpg`;
}

/**
 * Storage path in the Supabase bucket for a brand logo.
 */
export function storagePathForBrand(brandId: number | string): string {
  return `brands/${brandId}.jpg`;
}

/**
 * Storage path in the Supabase bucket for a CMS/static image file.
 * `filename` is the path relative to `/img/` (e.g. "cms/garanzia.jpeg");
 * avoids double-prefixing when it already starts with "cms/".
 */
export function storagePathForCms(filename: string): string {
  const clean = filename.replace(/^\/+/, "");
  return clean.startsWith("cms/") ? clean : `cms/${clean}`;
}

/**
 * Maps a file extension to a content type (for Supabase uploads).
 */
export function contentTypeFor(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    case "ico":
      return "image/x-icon";
    case "avif":
      return "image/avif";
    case "bmp":
      return "image/bmp";
    default:
      return "application/octet-stream";
  }
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
