import { NextResponse } from "next/server";

const ICECAT_API = "https://live.icecat.biz/api";
const ICECAT_USER = process.env.ICECAT_USERNAME || "";
const ICECAT_KEY = process.env.ICECAT_KEY || "";
const HAS_CREDENTIALS = Boolean(ICECAT_USER && ICECAT_KEY);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ean = searchParams.get("ean")?.trim();

  if (!ean || ean.length < 8) {
    return NextResponse.json({ error: "EAN non valido (minimo 8 cifre)." }, { status: 400 });
  }

  if (HAS_CREDENTIALS) {
    try {
      const url = `${ICECAT_API}?lang=it&ean_upc=${ean}&UserName=${ICECAT_USER}&ContentReader=${ICECAT_KEY}`;
      console.log(`[ICECAT] Fetching EAN ${ean}`);

      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        if (response.status === 404) return NextResponse.json({ found: false, error: "Prodotto non trovato su Icecat." }, { status: 404 });
        const err = await response.text();
        return NextResponse.json({ error: `Icecat: ${response.status} — ${err.slice(0, 200)}` }, { status: 502 });
      }

      const data = await response.json();
      if (!data?.data) {
        return NextResponse.json({ found: false, error: "Risposta Icecat vuota." }, { status: 404 });
      }

      const d: Record<string, unknown> = data.data as Record<string, unknown>;
      const gi = (d.GeneralInfo || d.product || {}) as Record<string, unknown>;
      const desc = (d.Description || d.SummaryDescription || {}) as Record<string, unknown>;
      const logi = (d.Logistics || {}) as Record<string, unknown>;
      const gallery = (d.Gallery || {}) as Record<string, unknown>;
      const bulletData = (d.BulletPoints || {}) as Record<string, unknown>;

      // ── Title ─────────────────────────────────────────────────────
      const title = String(gi.Title || gi.title || "");

      // ── Brand ─────────────────────────────────────────────────────
      const brandName = typeof gi.Brand === "string" ? String(gi.Brand) : "";
      const brandLogo = String(gi.BrandLogo || "");

      // ── Description ────────────────────────────────────────────────
      const shortDesc = String(
        desc.ShortSummaryDescription || desc.ShortDesc || desc.shortDesc || "",
      );
      const longDesc = String(
        desc.LongDesc || desc.LongDescription || desc.longDesc || desc.LongSummaryDescription || "",
      );

      // ── Weight ────────────────────────────────────────────────────
      let weight: number | null = null;
      const rawWeight = String(logi.Weight || logi.weight || "");
      const weightMatch = rawWeight.match(/[\d.]+/);
      if (weightMatch) weight = parseFloat(weightMatch[0]);

      // ── Dimensions ────────────────────────────────────────────────
      const width = String(logi.Width || logi.width || "");
      const height = String(logi.Height || logi.height || "");
      const depth = String(logi.Depth || logi.depth || "");

      // ── Images ───────────────────────────────────────────────────
      const images: { url: string; alt: string }[] = [];
      const highImg = String(gi.ImgHighRes || gi.HighResImage || gallery.HighResImage || gallery.HighRes || "");
      const lowImg = String(gi.ImgLowRes || gi.LowResImage || gallery.LowResImage || gallery.LowRes || "");
      if (highImg) images.push({ url: highImg, alt: `${title} - ${brandName}` });
      if (lowImg && lowImg !== highImg) images.push({ url: lowImg, alt: `${title} - ${brandName}` });

      // Try product images array from gallery
      try {
        const prodImgs = gallery.ProductImages || gallery.Images || [];
        if (Array.isArray(prodImgs)) {
          for (const img of prodImgs) {
            const imgUrl = String(img.ImgHighRes || img.HighRes || img.Img || img.url || "");
            if (imgUrl && !images.find(i => i.url === imgUrl)) {
              images.push({ url: imgUrl, alt: `${title} - ${brandName}` });
            }
          }
        }
      } catch { /* optional */ }

      // ── Specs (FeatureGroups) ─────────────────────────────────────
      const specs: { label: string; value: string }[] = [];
      try {
        const allFeatureData = (d.ProductFeature || gi.ProductFeature || {}) as Record<string, unknown>;
        const groups = allFeatureData.FeatureGroup || d.FeatureGroups || [];
        if (Array.isArray(groups)) {
          for (const g of groups) {
            const features = (g as Record<string, unknown>).ProductFeature || [];
            if (Array.isArray(features)) {
              for (const f of features) {
                const label = String(f.Name || f.name || "");
                const value = String(f.PresentationValue || f.Value || f.value || "");
                if (label && value) specs.push({ label, value });
              }
            }
          }
        }
      } catch { /* optional */ }

      // ── Bullet points (marketing) ─────────────────────────────────
      let bulletPoints = "";
      try {
        const bullets = bulletData.BulletPoint || [];
        if (Array.isArray(bullets)) {
          bulletPoints = bullets
            .map((b: unknown) => String((b as Record<string, unknown>).BulletPoint || b as string || ""))
            .filter(Boolean)
            .join("\n");
        }
      } catch { /* optional */ }

      // ── Category hint ─────────────────────────────────────────────
      let categoryHint = "";
      try {
        const family = d.ProductFamily as Record<string, unknown> || {};
        const name = family.Name || family.name || "";
        if (name) categoryHint = String(name);
      } catch { /* optional */ }

      return NextResponse.json({
        found: true,
        title,
        brand: brandName,
        brandLogo,
        shortDesc,
        longDesc,
        weight,
        dimensions: { width, height, depth },
        images,
        specs,
        bulletPoints,
        categoryHint,
        ean,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Errore sconosciuto";
      console.error("[ICECAT] Exception:", msg);
      return NextResponse.json({ error: `Icecat: ${msg}` }, { status: 500 });
    }
  }

  // ── Mock data (fallback when no credentials) ──────────────────────
  const mockDB: Record<string, Record<string, unknown>> = {
    "8806090545931": {
      title: "ASUS ROG Strix GeForce RTX 4090 OC 24GB", brand: "ASUS",
      shortDesc: "Scheda video con 24GB GDDR6X, tripla ventola Axial-tech.",
      specs: [
        { label: "GPU", value: "NVIDIA RTX 4090" },
        { label: "VRAM", value: "24GB GDDR6X" },
      ],
    },
  };
  const mock = mockDB[ean];
  if (!mock) return NextResponse.json({ found: false, error: "EAN non trovato. Credenziali Icecat non configurate." }, { status: 404 });
  return NextResponse.json({ found: true, ...mock, images: [], ean });
}
