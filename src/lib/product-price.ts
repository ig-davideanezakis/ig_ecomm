/**
 * Product display-price helpers.
 *
 * Legacy products (PrestaShop migration) carry a single "Default" product
 * variant whose price was never populated (0) — the real price lives in
 * product.base_price. A variant price of 0 therefore means "not set": the
 * storefront must fall back to the product base price, otherwise those
 * products would display €0,00.
 */

/** Display price for a variant row: a 0 (or negative) price inherits the base price. */
export function effectiveVariantPrice(variantPrice: number, basePrice: number): number {
  return variantPrice > 0 ? variantPrice : basePrice;
}

/** Lowest display price across variants (each falling back to base), or the base price. */
export function lowestDisplayPrice(
  variants: Array<{ price: number }> | null | undefined,
  basePrice: number,
): number {
  if (!variants || variants.length === 0) return basePrice;
  return Math.min(...variants.map((v) => effectiveVariantPrice(v.price, basePrice)));
}
