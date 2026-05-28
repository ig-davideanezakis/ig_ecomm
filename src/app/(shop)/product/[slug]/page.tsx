import { notFound } from "next/navigation";
import { getProductBySlug } from "@/db/queries";
import { ProductDetailClient } from "./product-detail-client";
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

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return <ProductDetailClient product={product as any} />;
}
