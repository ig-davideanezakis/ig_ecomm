/**
 * Icecat product data client.
 *
 * Uses the Icecat Live API (https://live.icecat.biz/api) which returns
 * localized product catalog data: title, brand, descriptions, gallery,
 * specs, bullet points.
 *
 * Authentication is passed as query params:
 *   - UserName: Icecat account username (ICECAT_USERNAME)
 *   - ContentReader: ContentReader key from the Icecat account (ICECAT_KEY)
 *
 * Note: the RESTful v3 API (bo.icecat.biz) is an editor/PIM API and requires
 * a different AccessKey (partner account). A ContentReader key is rejected
 * there (401), and v3 does not expose catalog data (GeneralInfo, Gallery,
 * FeaturesGroups) anyway — so the Live API is the single source here.
 */

const API_BASE = "https://live.icecat.biz/api";
const ICECAT_USER = process.env.ICECAT_USERNAME || "";
const ICECAT_KEY = process.env.ICECAT_KEY || "";
const TIMEOUT_MS = 15000;

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
  /** Specs preserved in their original Icecat FeaturesGroups. */
  specGroups: SpecGroup[];
  bulletPoints: string;
  categoryHint: string;
  ean: string;
}

/** A named group of spec rows (Icecat FeaturesGroup). */
export interface SpecGroup {
  group: string;
  rows: { label: string; value: string }[];
}

/** A single feature/spec entry inside a FeaturesGroup. */
interface FeatureItem {
  PresentationValue?: unknown;
  Value?: unknown;
  RawValue?: unknown;
  Feature?: {
    Name?: { Value?: unknown };
    Measure?: { Sign?: unknown };
  };
}

interface FeatureGroup {
  Name?: { Value?: unknown };
  /** Real Icecat shape: the group metadata (incl. localized name) is nested. */
  FeatureGroup?: { Name?: { Value?: unknown } };
  Features?: FeatureItem[];
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/** Fetch the raw Icecat Live API payload for an EAN (localized). */
export async function fetchIcecatProduct(ean: string, lang = "it"): Promise<Record<string, unknown>> {
  const params = new URLSearchParams({
    lang,
    ean_upc: ean,
    UserName: ICECAT_USER,
    ContentReader: ICECAT_KEY,
  });
  const url = `${API_BASE}?${params.toString()}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Icecat API ${res.status}: ${text.slice(0, 300)}`);
    }
    const json = (await res.json()) as { data?: unknown };
    const data = asRecord(json?.data);
    // A valid product has a non-empty GeneralInfo.Title.
    if (!asString(asRecord(data.GeneralInfo).Title)) {
      throw new Error("Product not found");
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

/** Extract the short/long descriptions from GeneralInfo. */
export function parseDescriptions(generalInfo: Record<string, unknown>): { short: string; long: string } {
  const summary = asRecord(generalInfo.SummaryDescription);
  return {
    short: asString(summary.ShortSummaryDescription),
    long: asString(summary.LongSummaryDescription),
  };
}

/** Extract brand from GeneralInfo.Brand (string or { Name }). */
export function parseBrand(generalInfo: Record<string, unknown>): string {
  const brand = generalInfo.Brand;
  if (typeof brand === "string") return brand;
  return asString(asRecord(brand).Name);
}

/** Extract a numeric value ("5,7 kg" → 5.7) from a feature. */
function parseNumber(value: unknown): number | null {
  const m = asString(value).match(/[\d.,]+/);
  if (!m) return null;
  const n = parseFloat(m[0].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * Extract the weight (kg) from the spec groups.
 * Only features whose name contains "peso/weight" are considered; among
 * those, priority is: packaged weight > weight without stand > first match.
 * The localized PresentationValue is preferred (carries the unit); when only
 * the raw numeric value is available and it looks like grams (> 100) it is
 * converted to kg.
 */
export function parseWeight(featureGroups: FeatureGroup[]): number | null {
  const findWeight = (priority: (label: string) => boolean): number | null => {
    for (const group of featureGroups) {
      for (const f of group.Features || []) {
        const label = asString(f.Feature?.Name?.Value).toLowerCase();
        if (!/peso|weight/.test(label)) continue;
        if (!priority(label)) continue;

        const presentation = asString(f.PresentationValue);
        const num = parseNumber(presentation);
        if (num !== null) return num;

        // No localized value: use the raw value, converting grams to kg.
        const raw = parseNumber(f.Value ?? f.RawValue);
        if (raw !== null) return raw > 100 ? raw / 1000 : raw;
      }
    }
    return null;
  };

  return (
    findWeight((l) => /imballo|packaged|confezion/.test(l)) ??
    findWeight((l) => /senza supporto|senza base|without (stand|base)/.test(l)) ??
    findWeight(() => true)
  );
}

/**
 * Extract width/height/depth (localized strings) from the spec groups.
 * Dimension names must contain the matching keyword AND look like a real
 * measurement (a digit); "Regolazione altezza: Sì" and similar controls are
 * skipped. Priority of matching groups: with stand > without stand > box.
 */
export function parseDimensions(featureGroups: FeatureGroup[]): { width: string; height: string; depth: string } {
  const priorities: RegExp[] = [
    /con supporto|with (stand|base)/,
    /senza supporto|senza base|without (stand|base)/,
    /imballo|packaged/,
  ];
  const keywords: { key: "width" | "height" | "depth"; re: RegExp }[] = [
    { key: "width", re: /larghezza|width/ },
    { key: "height", re: /altezza|height/ },
    { key: "depth", re: /profondit|depth/ },
  ];

  const dims = { width: "", height: "", depth: "" };
  for (const { key, re } of keywords) {
    for (const priority of priorities) {
      for (const group of featureGroups) {
        for (const f of group.Features || []) {
          const label = asString(f.Feature?.Name?.Value).toLowerCase();
          if (!re.test(label)) continue;
          if (!priority.test(label)) continue;
          if (/regolaz|max|min/.test(label)) continue;
          const value = asString(f.PresentationValue ?? f.Value ?? f.RawValue);
          if (!/\d/.test(value)) continue;
          dims[key] = value;
          break;
        }
        if (dims[key]) break;
      }
      if (dims[key]) break;
    }
  }
  return dims;
}

/** Flatten FeaturesGroups into { label, value }[] specs. */
export function parseSpecs(featureGroups: FeatureGroup[]): { label: string; value: string }[] {
  const specs: { label: string; value: string }[] = [];
  for (const group of featureGroups) {
    for (const f of group.Features || []) {
      const label = asString(f.Feature?.Name?.Value);
      const value = asString(f.PresentationValue ?? f.Value ?? f.RawValue);
      if (label && value) specs.push({ label, value });
    }
  }
  return specs;
}

/**
 * Parse FeaturesGroups keeping their original grouping (name + rows).
 * Groups without a name fall back to "Altro"; empty groups are dropped.
 */
export function parseSpecGroups(featureGroups: FeatureGroup[]): SpecGroup[] {
  const groups: SpecGroup[] = [];
  for (const group of featureGroups) {
    const rows: { label: string; value: string }[] = [];
    for (const f of group.Features || []) {
      const label = asString(f.Feature?.Name?.Value);
      const value = asString(f.PresentationValue ?? f.Value ?? f.RawValue);
      if (label && value) rows.push({ label, value });
    }
    if (rows.length === 0) continue;
    const name = asString(group.FeatureGroup?.Name?.Value || group.Name?.Value).trim();
    groups.push({ group: name || "Altro", rows });
  }
  return groups;
}

/**
 * Collect gallery images: main `Image` first, then the `Gallery` list
 * (one URL per photo, preferring Pic500x500 > Pic > LowPic). URLs are
 * deduped and the total is capped to avoid flooding the product form.
 */
export function parseImages(data: Record<string, unknown>, title: string, brand: string): { url: string; alt: string }[] {
  const images: { url: string; alt: string }[] = [];
  const seen = new Set<string>();
  const alt = `${title} - ${brand}`;
  const MAX_IMAGES = 12;

  const push = (url: string) => {
    const clean = url.trim();
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      images.push({ url: clean, alt });
    }
  };

  const mainImage = asRecord(data.Image);
  const mainUrl =
    asString(mainImage.HighPic) || asString(mainImage.Pic) || asString(mainImage.LowPic);
  push(mainUrl);

  for (const item of asArray(data.Gallery).slice(0, 10)) {
    const img = asRecord(item);
    const url = asString(img.Pic500x500) || asString(img.Pic) || asString(img.LowPic);
    push(url);
  }

  return images.slice(0, MAX_IMAGES);
}

/**
 * Bullet points: GeneralInfo.BulletPoints.Values, then
 * GeneratedBulletPoints.Values, then ReasonsToBuy, else "".
 */
export function parseBulletPoints(
  generalInfo: Record<string, unknown>,
  data: Record<string, unknown>,
): string {
  const collect = (v: unknown): string[] => {
    const rec = asRecord(v);
    return asArray(rec.Values).map(asString).filter(Boolean);
  };

  const primary = collect(generalInfo.BulletPoints);
  const generated = collect(generalInfo.GeneratedBulletPoints);
  const bullets = primary.length > 0 ? primary : generated;

  if (bullets.length > 0) return bullets.join("\n");

  const reasons = asArray(data.ReasonsToBuy).map((r) => {
    const rec = asRecord(r);
    const name = asRecord(rec.Name);
    return asString(name.Value ?? rec.Value ?? rec.Title);
  }).filter(Boolean);
  return reasons.join("\n");
}

/** Category hint from ProductFamily or Category (localized). */
export function parseCategoryHint(generalInfo: Record<string, unknown>): string {
  const family = asRecord(generalInfo.ProductFamily);
  const hint = asString(family.Value);
  if (hint) return hint;
  const category = asRecord(generalInfo.Category);
  return asString(asRecord(category.Name).Value);
}

/**
 * Aggregate all product data for an EAN from the Icecat Live API.
 * This is the main function called by the lookup endpoint.
 */
export async function lookupProductByEan(ean: string): Promise<IcecatProductData> {
  const data = await fetchIcecatProduct(ean);
  const generalInfo = asRecord(data.GeneralInfo);

  const title = asString(generalInfo.Title);
  const brand = parseBrand(generalInfo);
  const brandLogo = asString(generalInfo.BrandLogo);

  const descriptions = parseDescriptions(generalInfo);
  const featureGroups = asArray(data.FeaturesGroups) as FeatureGroup[];

  return {
    found: true,
    title,
    brand,
    brandLogo,
    shortDesc: descriptions.short,
    longDesc: descriptions.long,
    weight: parseWeight(featureGroups),
    dimensions: parseDimensions(featureGroups),
    images: parseImages(data, title, brand),
    specs: parseSpecs(featureGroups),
    specGroups: parseSpecGroups(featureGroups),
    bulletPoints: parseBulletPoints(generalInfo, data),
    categoryHint: parseCategoryHint(generalInfo),
    ean,
  };
}
