import { NextResponse } from "next/server";

/**
 * GET /api/products/lookup-ean?ean=1234567890123
 *
 * Looks up product information by EAN/GTIN code via Icecat.
 * Returns: title, brand, description, images, specs.
 * Price and stock are NOT included (must be set manually).
 *
 * In MVP mode, returns mock data for known EANs.
 * In production, this would call the Icecat API.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ean = searchParams.get("ean")?.trim();

  if (!ean || ean.length < 8) {
    return NextResponse.json({ error: "EAN non valido." }, { status: 400 });
  }

  // ── In production, call Icecat API here ─────────────────────────
  // const icecat = await fetch(
  //   `https://live.icecat.biz/api?lang=it&ean_upc=${ean}&UserName=${ICECAT_USER}&ContentReader=${ICECAT_KEY}`
  // );
  // const data = await icecat.json();

  // ── MVP mock data for common test EANs ──────────────────────────
  const mockDatabase: Record<string, {
    title: string;
    brand: string;
    description: string;
    specs: Record<string, string>[];
  }> = {
    "1234567890123": {
      title: 'Notebook Dell XPS 15 (2024)',
      brand: "Dell",
      description: "Notebook professionale con display InfinityEdge da 15.6\", processore Intel Core i7-13700H, 16GB RAM DDR5, SSD 512GB NVMe. Ideale per professionisti e creativi.",
      specs: [
        { label: "Processore", value: "Intel Core i7-13700H" },
        { label: "RAM", value: "16GB DDR5" },
        { label: "Storage", value: "512GB SSD NVMe" },
        { label: "Display", value: '15.6" Full HD+ InfinityEdge' },
        { label: "Sistema Operativo", value: "Windows 11 Pro" },
      ],
    },
    "9876543210987": {
      title: 'Monitor LG UltraFine 27" 4K',
      brand: "LG",
      description: 'Monitor professionale 27" 4K UHD (3840x2160) con copertura DCI-P3 98%, ideale per progettazione grafica e video editing.',
      specs: [
        { label: "Dimensioni", value: '27"' },
        { label: "Risoluzione", value: "3840x2160 (4K UHD)" },
        { label: "Pannello", value: "IPS" },
        { label: "Rapporto d'aspetto", value: "16:9" },
        { label: "Connettività", value: "USB-C, HDMI, DisplayPort" },
      ],
    },
    "5555555555555": {
      title: 'Tastiera Meccanica Logitech MX Mechanical',
      brand: "Logitech",
      description: "Tastiera meccanica wireless con illuminazione RGB per professionisti. Switches tactili silenziosi e connettività multipoint.",
      specs: [
        { label: "Tipo", value: "Meccanica" },
        { label: "Connessione", value: "Bluetooth / USB-C" },
        { label: "Layout", value: "IT (Italiano)" },
        { label: "Retroilluminazione", value: "RGB" },
        { label: "Autonomia", value: "Fino a 15 giorni" },
      ],
    },
  };

  const product = mockDatabase[ean];
  if (!product) {
    return NextResponse.json({ found: false, error: "Prodotto non trovato per questo EAN." }, { status: 404 });
  }

  return NextResponse.json({
    found: true,
    title: product.title,
    brand: product.brand,
    description: product.description,
    specs: product.specs,
    images: [] as string[],
    ean,
  });
}
