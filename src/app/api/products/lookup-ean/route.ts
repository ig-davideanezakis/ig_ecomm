import { NextResponse } from "next/server";

const ICECAT_API = "https://live.icecat.biz/api";
const ICECAT_USER = process.env.ICECAT_USERNAME || "";
const ICECAT_KEY = process.env.ICECAT_KEY || "";
const HAS_CREDENTIALS = Boolean(ICECAT_USER && ICECAT_KEY);

/**
 * GET /api/products/lookup-ean?ean=8806090545931
 *
 * Looks up product data by EAN via Icecat API (requires credentials).
 * When no credentials are set, uses a small built-in mock database.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ean = searchParams.get("ean")?.trim();

  if (!ean || ean.length < 8) {
    return NextResponse.json({ error: "EAN non valido (minimo 8 cifre)." }, { status: 400 });
  }

  // ── Real Icecat API call ──────────────────────────────────────────
  if (HAS_CREDENTIALS) {
    try {
      const url = `${ICECAT_API}?lang=it&ean_upc=${ean}&UserName=${ICECAT_USER}&ContentReader=${ICECAT_KEY}`;
      console.log(`[ICECAT] Fetching: ${url.replace(ICECAT_KEY, "***").replace(ICECAT_USER, "***")}`);

      const response = await fetch(url, {
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(15000),
      });

      console.log(`[ICECAT] Response status: ${response.status}`);

      if (!response.ok) {
        if (response.status === 404) {
          return NextResponse.json({ found: false, error: "Prodotto non trovato su Icecat." }, { status: 404 });
        }
        const err = await response.text();
        console.error("[ICECAT] API error:", response.status, err.slice(0, 500));
        return NextResponse.json({ error: `Icecat: ${response.status}` }, { status: 502 });
      }

      const data = await response.json();
      console.log(`[ICECAT] Response keys: ${Object.keys(data).join(", ")}`);

      // Try different response paths that Icecat might use
      let product: Record<string, unknown> | null = null;

      if (data?.data?.product) {
        product = data.data.product;
      } else if (data?.product) {
        product = data.product;
      } else if (Array.isArray(data?.data)) {
        product = data.data[0]?.product || null;
      }

      if (!product) {
        console.log("[ICECAT] Full response preview:", JSON.stringify(data).slice(0, 1000));
        return NextResponse.json({
          found: false,
          error: "Formato risposta Icecat non riconosciuto. Verifica le credenziali.",
          debug: JSON.stringify(data).slice(0, 500),
        }, { status: 502 });
      }

      const title = String(product.Title || product.ProductTitle || product.title || "");
      const brand = product.Brand
        ? String((product.Brand as Record<string, unknown>).Name || product.Brand as string || "")
        : "";
      const description = String(
        (product as Record<string, unknown>).SummaryDescription
          ? ((product as Record<string, unknown>).SummaryDescription as Record<string, unknown>).ShortSummaryDescription || ""
          : (product as Record<string, unknown>).Description
            ? ((product as Record<string, unknown>).Description as Record<string, unknown>).LongDesc || ""
            : product.description || "",
      );
      const images: { url: string; alt: string }[] = [];
      if (product.ImgHighRes) images.push({ url: String(product.ImgHighRes), alt: `${title} - ${brand}` });
      if (product.ImgLowRes) images.push({ url: String(product.ImgLowRes), alt: `${title} - ${brand}` });

      // Parse specs from ProductFeature
      const specs: { label: string; value: string }[] = [];
      try {
        const featureGroups = (product.ProductFeature as Record<string, unknown>)?.FeatureGroup
          || (product as Record<string, unknown>).FeatureGroups
          || [];
        if (Array.isArray(featureGroups)) {
          for (const group of featureGroups) {
            const features = (group as Record<string, unknown>).ProductFeature || [];
            if (Array.isArray(features)) {
              for (const f of features) {
                const label = String(f.Name || f.name || "");
                const value = String(f.PresentationValue || f.Value || f.value || "");
                if (label && value) specs.push({ label, value });
              }
            }
          }
        }
      } catch { /* specs optional */ }

      return NextResponse.json({ found: true, title, brand, description, specs, images, ean });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Errore sconosciuto";
      console.error("[ICECAT] Exception:", msg);
      return NextResponse.json({ error: `Icecat: ${msg}` }, { status: 500 });
    }
  }

  // ── Mock data (no credentials) ─────────────────────────────────────
  const mockDB: Record<string, { title: string; brand: string; description: string; specs: { label: string; value: string }[] }> = {
    "1234567890123": {
      title: "Notebook Dell XPS 15 (2024)", brand: "Dell",
      description: "Notebook professionale con Intel Core i7-13700H, 16GB RAM DDR5, SSD 512GB NVMe.",
      specs: [
        { label: "Processore", value: "Intel Core i7-13700H" },
        { label: "RAM", value: "16GB DDR5" },
        { label: "Storage", value: "512GB SSD NVMe" },
        { label: "Display", value: '15.6" Full HD+' },
        { label: "SO", value: "Windows 11 Pro" },
      ],
    },
    "8806090545931": {
      title: "ASUS ROG Strix GeForce RTX 4090 OC 24GB", brand: "ASUS",
      description: "Scheda video con 24GB GDDR6X, tripla ventola Axial-tech e RGB Aura Sync.",
      specs: [
        { label: "GPU", value: "NVIDIA RTX 4090" },
        { label: "VRAM", value: "24GB GDDR6X" },
        { label: "CUDA Core", value: "16384" },
      ],
    },
  };

  const mock = mockDB[ean];
  if (!mock) {
    return NextResponse.json({ found: false, error: "EAN non trovato. Credenziali Icecat non configurate." }, { status: 404 });
  }
  return NextResponse.json({ found: true, ...mock, images: [], ean });
}
