import { NextResponse } from "next/server";

const ICECAT_API = "https://live.icecat.biz/api";
const ICECAT_USER = process.env.ICECAT_USERNAME || "";
const ICECAT_KEY = process.env.ICECAT_KEY || "";

/**
 * GET /api/products/lookup-ean?ean=1234567890123
 *
 * Looks up product information by EAN/GTIN code via Icecat.
 * Returns: title, brand, description, specs, images.
 * Price and stock are NOT included — must be set manually in the form.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ean = searchParams.get("ean")?.trim();

  if (!ean || ean.length < 8) {
    return NextResponse.json({ error: "EAN non valido (minimo 8 cifre)." }, { status: 400 });
  }

  // ── MVP mock data for common test EANs (when Icecat credentials not set) ─
  if (!ICECAT_USER || !ICECAT_KEY) {
    const mockDatabase: Record<string, {
      title: string; brand: string; description: string; specs: { label: string; value: string }[];
    }> = {
      "1234567890123": {
        title: 'Notebook Dell XPS 15 (2024)',
        brand: "Dell",
        description: "Notebook professionale con display InfinityEdge 15.6\", Intel Core i7-13700H, 16GB RAM DDR5, SSD 512GB NVMe.",
        specs: [
          { label: "Processore", value: "Intel Core i7-13700H" },
          { label: "RAM", value: "16GB DDR5" },
          { label: "Storage", value: "512GB SSD NVMe" },
          { label: "Display", value: '15.6" Full HD+ InfinityEdge' },
          { label: "SO", value: "Windows 11 Pro" },
        ],
      },
      "9876543210987": {
        title: 'Monitor LG UltraFine 27" 4K',
        brand: "LG",
        description: 'Monitor professionale 27" 4K UHD (3840x2160), DCI-P3 98%, ideale per progettazione grafica.',
        specs: [
          { label: "Dimensioni", value: '27"' },
          { label: "Risoluzione", value: "3840x2160 (4K UHD)" },
          { label: "Pannello", value: "IPS" },
          { label: "Connettività", value: "USB-C, HDMI, DisplayPort" },
        ],
      },
      "8806090545931": {
        title: "ASUS ROG Strix GeForce RTX 4090 OC Edition 24GB",
        brand: "ASUS",
        description: "Scheda video ASUS ROG Strix GeForce RTX 4090 con 24GB GDDR6X, overclock di fabbrica, tripla ventola Axial-tech e RGB Aura Sync.",
        specs: [
          { label: "GPU", value: "NVIDIA GeForce RTX 4090" },
          { label: "VRAM", value: "24GB GDDR6X" },
          { label: "CUDA Core", value: "16384" },
          { label: "Clock Boost", value: "2610 MHz (OC mode)" },
          { label: "Connettori", value: "3x DP 1.4a, 2x HDMI 2.1" },
          { label: "Alimentazione", value: "1000W consigliato" },
        ],
      },
      "4711387336977": {
        title: "Samsung SSD 990 Pro 2TB NVMe PCIe 4.0",
        brand: "Samsung",
        description: "SSD NVMe M.2 PCIe Gen 4.0 x4. Lettura fino a 7.450 MB/s, ideale per gaming e workstation.",
        specs: [
          { label: "Capacità", value: "2TB" },
          { label: "Interfaccia", value: "M.2 NVMe PCIe 4.0" },
          { label: "Lettura seq.", value: "Fino a 7.450 MB/s" },
          { label: "NAND", value: "Samsung V-NAND" },
          { label: "Durata", value: "1.200 TBW" },
        ],
      },
    };

    const mock = mockDatabase[ean];
    if (!mock) {
      return NextResponse.json({ found: false, error: "Prodotto non trovato per questo EAN (modalità mock)." }, { status: 404 });
    }
    return NextResponse.json({ found: true, ...mock, images: [], ean });
  }

  // ── Real Icecat API call ──────────────────────────────────────────
  try {
    const response = await fetch(
      `${ICECAT_API}?lang=it&ean_upc=${ean}&UserName=${ICECAT_USER}&ContentReader=${ICECAT_KEY}`,
      { headers: { "Accept": "application/json" } },
    );

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ found: false, error: "Prodotto non trovato su Icecat." }, { status: 404 });
      }
      const err = await response.text();
      console.error("[ICECAT] API error:", response.status, err.slice(0, 300));
      return NextResponse.json({ error: `Icecat API error: ${response.status}` }, { status: 502 });
    }

    const data = await response.json();

    // Parse Icecat response
    const product = data?.data?.product;
    if (!product) {
      return NextResponse.json({ found: false, error: "Risposta Icecat vuota." }, { status: 404 });
    }

    const title = product.Title || product.ProductTitle || "";
    const brand = product.Brand?.Name || "";
    const description = product.SummaryDescription?.ShortSummaryDescription || product.Description?.LongDesc || "";
    const images = [product.ImgHighRes, product.ImgLowRes].filter(Boolean).map((url: string) => ({
      url,
      alt: `${title} - ${brand}`,
    }));
    const specs = (product.ProductFeature?.FeatureGroup || [])
      .flatMap((g: { ProductFeature?: { Name?: string; Value?: string; PresentationValue?: string }[] }) =>
        (g.ProductFeature || []).map((f: { Name?: string; Value?: string; PresentationValue?: string }) => ({
          label: f.Name || "",
          value: f.PresentationValue || f.Value || "",
        })),
      )
      .filter((s: { label: string; value: string }) => s.label && s.value);

    return NextResponse.json({ found: true, title, brand, description, specs, images, ean });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Errore di connessione Icecat.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
