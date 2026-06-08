/**
 * Icecat RESTful v3 API client.
 * Docs: https://api.icecat.biz/ (Swagger)
 * Base: https://bo.icecat.biz/restful/v3
 *
 * Authentication:
 *   - AccessKey: typically the ContentReader key from Icecat account
 *   - SessionType: "rest"
 */

const API_BASE = "https://bo.icecat.biz/restful/v3";
const ACCESS_KEY = process.env.ICECAT_KEY || "";
const SESSION_TYPE = "rest";

interface IcecatHeaders {
  "Content-Type": "application/json";
  Accept: "application/json";
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}${path.includes("?") ? "&" : "?"}AccessKey=${ACCESS_KEY}&SessionType=${SESSION_TYPE}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Icecat API ${res.status}: ${text.slice(0, 300)}`);
    }
    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Step 1: Search for products by EAN.
 * Returns an array of { ProductId, ... } or throws.
 */
export async function searchByEan(ean: string): Promise<{ ProductId: number }[]> {
  const data = await apiFetch<{ data?: { ProductSearch?: { ProductId: number }[] } }>("/Productsearch", {
    method: "POST",
    body: JSON.stringify({ Eans: [ean] }),
  });
  const results = data?.data?.ProductSearch;
  if (!results || results.length === 0) {
    throw new Error("Product not found");
  }
  return results;
}

/**
 * Step 2: Get full product info by Icecat ProductId.
 * Returns ATS (Attribute Tree Set) data which includes title, brand, description, etc.
 */
export async function getProductAts(productId: number): Promise<Record<string, unknown>> {
  const data = await apiFetch<{ data?: Record<string, unknown> }>(`/ATS/${productId}`);
  return data?.data || {};
}

/**
 * Step 3: Get bullet points for a product.
 * LanguageId 2 = English, 5 = Italian
 */
export async function getBulletPoints(productId: number, languageId = 5): Promise<{ BulletPoint?: string }[]> {
  try {
    const data = await apiFetch<{ data?: { BulletPoints?: { BulletPoint?: string }[] } }>(
      `/BulletPoints?ProductId=${productId}&LanguageId=${languageId}`,
    );
    return data?.data?.BulletPoints || [];
  } catch {
    // Bullet points are optional
    return [];
  }
}

/**
 * Step 4: Get gallery images for a variant.
 */
export async function getVariantGallery(variantId: number): Promise<{ ImgHighRes?: string; ImgLowRes?: string }[]> {
  try {
    const data = await apiFetch<{ data?: { Gallery?: { ImgHighRes?: string; ImgLowRes?: string }[] } }>(
      `/Variants/${variantId}/Gallery`,
    );
    return data?.data?.Gallery || [];
  } catch {
    return [];
  }
}

/**
 * Aggregate all product data from multiple Icecat API calls.
 * This is the main function called by the lookup endpoint.
 */
export interface IcecatProductData {
  found: boolean;
  title: string;
  brand: string;
  brandLogo: string;
  shortDesc: string;
  longDesc: string;
  weight: number | null;
  dimensions: { width: string; height: string; depth: string };
  images: { url: string; alt: string }[];
  specs: { label: string; value: string }[];
  bulletPoints: string;
  categoryHint: string;
  ean: string;
}

export async function lookupProductByEan(ean: string): Promise<IcecatProductData> {
  // Step 1: Search by EAN to get Icecat ProductId
  const results = await searchByEan(ean);
  const productId = results[0].ProductId;

  // Step 2: Get full ATS product info
  const ats = await getProductAts(productId);

  // Parse ATS response
  const generalInfo = (ats.GeneralInfo || {}) as Record<string, unknown>;
  const description = (ats.Description || {}) as Record<string, unknown>;
  const logistics = (ats.Logistics || {}) as Record<string, unknown>;
  const gallery = (ats.Gallery || {}) as Record<string, unknown>;
  const featureData = (ats.ProductFeature || {}) as Record<string, unknown>;

  const title = String(generalInfo.Title || generalInfo.title || "");
  const brandName = typeof generalInfo.Brand === "string"
    ? String(generalInfo.Brand)
    : String((generalInfo.Brand as Record<string, unknown>)?.Name || "");
  const brandLogo = String(generalInfo.BrandLogo || "");

  const shortDesc = String(
    (description.ShortSummaryDescription as string) || (description.ShortDesc as string) || "",
  );
  const longDesc = String(
    (description.LongDesc as string) || (description.LongDescription as string) || "",
  );

  let weight: number | null = null;
  const rawWeight = String(logistics.Weight || logistics.weight || "");
  const wm = rawWeight.match(/[\d.]+/);
  if (wm) weight = parseFloat(wm[0]);

  // Images from gallery
  const images: { url: string; alt: string }[] = [];
  const highImg = String(generalInfo.ImgHighRes || gallery.HighResImage || "");
  const lowImg = String(generalInfo.ImgLowRes || gallery.LowResImage || "");
  if (highImg) images.push({ url: highImg, alt: `${title} - ${brandName}` });
  if (lowImg && lowImg !== highImg) images.push({ url: lowImg, alt: `${title} - ${brandName}` });

  // Also fetch gallery from variants
  try {
    const variants = (ats.Variants || []) as Array<{ id?: number; ProductId?: number }>;
    for (const v of variants.slice(0, 3)) {
      const variantId = v.id || v.ProductId || 0;
      if (variantId) {
        const galleryItems = await getVariantGallery(variantId);
        for (const img of galleryItems) {
          const url = img.ImgHighRes || img.ImgLowRes || "";
          if (url && !images.find(i => i.url === url)) {
            images.push({ url, alt: `${title} - ${brandName}` });
          }
        }
      }
    }
  } catch { /* optional */ }

  // Specs from FeatureGroups
  const specs: { label: string; value: string }[] = [];
  try {
    const groups = (featureData.FeatureGroup || []) as Array<Record<string, unknown>>;
    for (const g of groups) {
      const features = (g.ProductFeature || []) as Array<Record<string, unknown>>;
      for (const f of features) {
        const label = String(f.Name || f.name || "");
        const value = String(f.PresentationValue || f.Value || f.value || "");
        if (label && value) specs.push({ label, value });
      }
    }
  } catch { /* optional */ }

  // Bullet points (separate API call)
  const bulletPoints = await getBulletPoints(productId);
  const bulletText = bulletPoints
    .map((b) => String(b.BulletPoint || ""))
    .filter(Boolean)
    .join("\n");

  // Category hint
  let categoryHint = "";
  try {
    const family = (ats.ProductFamily || {}) as Record<string, unknown>;
    categoryHint = String(family.Name || family.name || "");
  } catch { /* optional */ }

  return {
    found: true,
    title,
    brand: brandName,
    brandLogo,
    shortDesc,
    longDesc,
    weight,
    dimensions: {
      width: String(logistics.Width || logistics.width || ""),
      height: String(logistics.Height || logistics.height || ""),
      depth: String(logistics.Depth || logistics.depth || ""),
    },
    images,
    specs,
    bulletPoints: bulletText,
    categoryHint,
    ean,
  };
}
