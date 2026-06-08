import { NextResponse } from "next/server";
import { lookupProductByEan } from "@/lib/icecat";

const ICECAT_USER = process.env.ICECAT_USERNAME || "";
const ICECAT_KEY = process.env.ICECAT_KEY || "";
const HAS_CREDENTIALS = Boolean(ICECAT_USER && ICECAT_KEY);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ean = searchParams.get("ean")?.trim();

  if (!ean || ean.length < 8) {
    return NextResponse.json({ error: "EAN non valido (minimo 8 cifre)." }, { status: 400 });
  }

  if (!HAS_CREDENTIALS) {
    return NextResponse.json({ found: false, error: "Icecat credentials not configured." }, { status: 503 });
  }

  // ── RESTful v3 API (multi-call) ──────────────────────────────────
  try {
    console.log(`[ICECAT] Looking up EAN ${ean} via RESTful v3...`);
    const result = await lookupProductByEan(ean);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[ICECAT] RESTful v3 failed: ${msg}`);

    // ── Fallback: live.icecat.biz/api ──────────────────────────────
    try {
      console.log("[ICECAT] Falling back to live.icecat.biz/api...");
      const url = `https://live.icecat.biz/api?lang=it&ean_upc=${ean}&UserName=${ICECAT_USER}&ContentReader=${ICECAT_KEY}`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        return NextResponse.json({
          found: false,
          error: `Icecat error: ${res.status}. ${msg}`,
        }, { status: 502 });
      }

      const data = await res.json();
      const d = data?.data as Record<string, unknown> || {};
      const gi = (d.GeneralInfo || {}) as Record<string, unknown>;
      const description = (d.Description || {}) as Record<string, unknown>;
      const logistics = (d.Logistics || {}) as Record<string, unknown>;
      const gallery = (d.Gallery || {}) as Record<string, unknown>;

      const title = String(gi.Title || "");
      const brandName = typeof gi.Brand === "string" ? String(gi.Brand) : "";

      const shortDesc = String(description.ShortSummaryDescription || description.ShortDesc || "");
      const longDesc = String(description.LongDesc || description.LongDescription || "");

      let weight: number | null = null;
      const wm = String(logistics.Weight || "").match(/[\d.]+/);
      if (wm) weight = parseFloat(wm[0]);

      const images: { url: string; alt: string }[] = [];
      const highImg = String(gi.ImgHighRes || gallery.HighResImage || "");
      const lowImg = String(gi.ImgLowRes || gallery.LowResImage || "");
      if (highImg) images.push({ url: highImg, alt: `${title} - ${brandName}` });
      if (lowImg && lowImg !== highImg) images.push({ url: lowImg, alt: `${title} - ${brandName}` });

      const specs: { label: string; value: string }[] = [];
      try {
        const featureData = (d.ProductFeature || {}) as Record<string, unknown>;
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

      return NextResponse.json({
        found: true,
        title, brand: brandName, brandLogo: String(gi.BrandLogo || ""),
        shortDesc, longDesc,
        weight,
        dimensions: {
          width: String(logistics.Width || ""),
          height: String(logistics.Height || ""),
          depth: String(logistics.Depth || ""),
        },
        images, specs, bulletPoints: "", categoryHint: String((d.ProductFamily as Record<string, unknown>)?.Name || ""),
        ean,
      });
    } catch (fallbackErr) {
      const fbMsg = fallbackErr instanceof Error ? fallbackErr.message : "Fallback failed";
      return NextResponse.json({ error: `RESTful v3: ${msg}. Fallback: ${fbMsg}` }, { status: 502 });
    }
  }
}
