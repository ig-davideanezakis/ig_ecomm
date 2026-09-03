import { notFound } from "next/navigation";
import { getProductBySlug, getSpecChipsConfig, type ProductDetail } from "@/db/queries";
import { ProductDetailClient } from "./product-detail-client";
import { extractSpecChips } from "@/lib/spec-chips";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) return { title: "Prodotto non trovato — Infograf Store" };

  return {
    title: product.seoTitle || `${product.title} — Infograf Store`,
    description: product.seoDescription || product.description || undefined,
    openGraph: {
      title: product.seoTitle || product.title,
      description: product.seoDescription || product.description || undefined,
      images: product.images?.[0]?.url ? [{ url: product.images[0].url }] : [],
    },
  };
}

/** Schema.org Product JSON-LD — powers rich snippets in Google results. */
function buildProductJsonLd(product: ProductDetail) {
  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
  const availability =
    totalStock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";

  const baseOffer = {
    "@type": "Offer" as const,
    priceCurrency: "EUR",
    availability,
    itemCondition: "https://schema.org/NewCondition",
    url: `https://ig-ecomm.vercel.app/product/${product.slug}`,
  };

  const offers =
    product.variants.length > 1
      ? product.variants.map((v) => ({
          ...baseOffer,
          price: v.price,
          availability: v.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          ...(v.sku ? { sku: v.sku } : {}),
        }))
      : { ...baseOffer, price: product.basePrice };

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    ...(product.description ? { description: product.description } : {}),
    ...(product.sku ? { sku: product.sku } : {}),
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand.name } } : {}),
    image: product.images.map((img) => img.url),
    offers,
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [product, chipsConfig] = await Promise.all([
    getProductBySlug(slug),
    getSpecChipsConfig(),
  ]);

  if (!product) {
    notFound();
  }

  const jsonLd = buildProductJsonLd(product);

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailClient
        product={product}
        specChips={extractSpecChips(product.specifications, chipsConfig)}
      />
    </>
  );
}
