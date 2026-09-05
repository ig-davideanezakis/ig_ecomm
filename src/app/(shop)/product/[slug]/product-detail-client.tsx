"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { effectiveVariantPrice } from "@/lib/product-price";
import { useCart } from "@/lib/cart-store";
import { ProductGallery } from "@/components/shop/product-gallery";
import { ProductTabs } from "@/components/shop/product-tabs";
import type { ProductInfoTabs } from "@/lib/product-tabs";
import { ProductSpecChips } from "@/components/shop/product-spec-chips";
import type { SpecChipValue } from "@/lib/spec-chips";

// ─── Types ────────────────────────────────────────────────────────

interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
}

interface ProductVariant {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  stock: number;
  lowStock: number;
  image: string | null;
  sortOrder: number;
}

interface ProductDetail {
  id: string;
  identifier: string;
  title: string;
  slug: string;
  description: string | null;
  content: string | null;
  /** Marketing/overview rich HTML (rendered in the "Panoramica" tab). */
  overview: string | null;
  specifications: string | null;
  basePrice: number;
  compareAtPrice: number | null;
  sku: string | null;
  barcode: string | null;
  featured: boolean;
  category: { id: string; name: string; slug: string } | null;
  brand: { id: string; name: string; slug: string; logo: string | null } | null;
  images: ProductImage[];
  variants: ProductVariant[];
}

// ─── Props ────────────────────────────────────────────────────────

interface ProductDetailClientProps {
  product: ProductDetail;
  /** Key specs extracted server-side — rendered as icon+value chips. */
  specChips?: SpecChipValue[];
  /** Store-wide content for the Come acquista / Garanzia / Recesso tabs. */
  infoTabs: ProductInfoTabs;
}

// ─── Main Component ───────────────────────────────────────────────

export function ProductDetailClient({ product, specChips = [], infoTabs }: ProductDetailClientProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants?.[0] ?? null,
  );

  const { addItem } = useCart();

  // Variant price 0 means "not set" (legacy Default variants) → base price wins
  const currentPrice = selectedVariant
    ? effectiveVariantPrice(selectedVariant.price, product.basePrice)
    : product.basePrice;
  const hasDiscount =
    product.compareAtPrice && product.compareAtPrice > currentPrice;
  const inStock = selectedVariant ? selectedVariant.stock > 0 : true;
  const isLowStock =
    selectedVariant &&
    selectedVariant.stock > 0 &&
    selectedVariant.stock <= selectedVariant.lowStock;

  const images = product.images?.length
    ? product.images.sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  const handleAddToCart = useCallback(() => {
    addItem({
      productId: product.id,
      variantId: selectedVariant?.id ?? product.id,
      slug: product.slug,
      title: product.title,
      image: images[0]?.url ?? "",
      price: currentPrice,
      quantity: 1,
      variantName: selectedVariant?.name ?? "Default",
    });
    // Visual feedback — will be replaced with a toast later
    alert(`${product.title} aggiunto al carrello!`);
  }, [addItem, product, selectedVariant, images, currentPrice]);

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 pb-28 sm:px-6 lg:px-8 lg:pb-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-muted-foreground">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link href="/products" className="hover:text-foreground transition-colors">
              Prodotti
            </Link>
          </li>
          {product.category && (
            <>
              <li>/</li>
              <li>
                <Link
                  href={`/products?category=${product.category.slug}`}
                  className="hover:text-foreground transition-colors"
                >
                  {product.category.name}
                </Link>
              </li>
            </>
          )}
          <li>/</li>
          <li className="text-foreground font-medium truncate max-w-[200px]">
            {product.title}
          </li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* ─── Images ───────────────────────────────────────────── */}
        <ProductGallery
          images={images}
          title={product.title}
          badges={
            <>
              {hasDiscount && (
                <span className="rounded bg-primary px-2.5 py-1 text-xs font-bold text-white">
                  -{Math.round(((1 - currentPrice / product.compareAtPrice!) * 100))}%
                </span>
              )}
              {product.featured && !hasDiscount && (
                <span className="rounded bg-primary/90 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  In evidenza
                </span>
              )}
            </>
          }
        />

        {/* ─── Product Info ─────────────────────────────────────── */}
        <div className="flex flex-col gap-6">
          {/* Brand & Category */}
          <div className="flex items-center gap-3 text-sm">
            {product.brand && (
              <span className="rounded-md border border-border bg-muted px-2.5 py-1 font-medium text-muted-foreground">
                {product.brand.name}
              </span>
            )}
            {product.category && (
              <Link
                href={`/products?category=${product.category.slug}`}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {product.category.name}
              </Link>
            )}
            <span className="text-xs text-muted-foreground">
              SKU: {product.sku ?? product.identifier}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
            {product.title}
          </h1>

          {/* Description */}
          {product.description && (
            <p className="text-base leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          )}

          {/* Key specs chips (CPU, RAM, storage, …) */}
          {specChips.length > 0 && (
            <ProductSpecChips chips={specChips} variant="detail" />
          )}

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-foreground">
              {formatPrice(currentPrice)}
            </span>
            {hasDiscount && (
              <span className="text-xl text-muted-foreground line-through">
                {formatPrice(product.compareAtPrice!)}
              </span>
            )}
          </div>

          {/* Variants */}
          {product.variants.length > 1 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Varianti
              </h3>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v)}
                    className={`rounded-md border px-4 py-2 text-sm font-medium transition-all ${
                      selectedVariant?.id === v.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-muted-foreground"
                    } ${v.stock === 0 ? "cursor-not-allowed opacity-40" : ""}`}
                    disabled={v.stock === 0}
                  >
                    {v.name}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {formatPrice(v.price)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stock status — traffic-light with explicit copy */}
          <div className="rounded-lg border bg-card p-3">
            {inStock ? (
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-success">
                    {isLowStock ? `Ultimi ${selectedVariant!.stock} pezzi in magazzino` : "Pronto per la spedizione"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isLowStock
                      ? "Ordina subito: quantità limitata"
                      : "Spedito in 24/48h dalla sede di Palermo"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-destructive">Al momento esaurito</p>
                  <p className="text-xs text-muted-foreground">
                    Chiamaci allo{" "}
                    <a href="tel:+39091342171" className="text-primary underline hover:opacity-80">
                      091 342171
                    </a>{" "}
                    per conoscere la data di arrivo.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Add to cart */}
          <button
            onClick={handleAddToCart}
            disabled={!inStock}
            className="w-full rounded-md bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 neon-glow"
          >
            {inStock ? "Aggiungi al carrello" : "Al momento non disponibile"}
          </button>

          {/* Divider */}
          <hr className="border-border" />

          {/* Trust bar */}
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-primary">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
              <span>
                <span className="block font-medium text-foreground">Spedizione rapida</span>
                <span className="text-xs">In 24/48h in tutta Italia</span>
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-primary">
                <path d="M3 11v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6" />
                <path d="M12 3v9" />
                <path d="M8 8l4-4 4 4" />
              </svg>
              <span>
                <span className="block font-medium text-foreground">Ritiro in sede</span>
                <span className="text-xs">Via Duca della Verdura 23, Palermo</span>
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-primary">
                <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>
                <span className="block font-medium text-foreground">Garanzia 24 mesi</span>
                <span className="text-xs">E resi entro 14 giorni</span>
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-primary">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span>
                <span className="block font-medium text-foreground">Assistenza locale</span>
                <a href="tel:+39091342171" className="text-xs text-primary underline hover:opacity-80">
                  Chiamaci: 091 342171
                </a>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Tabbed content: Panoramica / Descrizione / Specifiche / info ── */}
      <ProductTabs
        productTitle={product.title}
        overviewHtml={product.overview}
        contentHtml={product.content}
        specificationsJson={product.specifications}
        infoTabs={infoTabs}
      />

      {/* ─── Related Products (placeholder) ─────────────────────── */}
      <SectionAnimation className="mt-20">
        <h2 className="mb-8 text-2xl font-bold">Prodotti correlati</h2>
        <p className="text-muted-foreground">
          (Da implementare — mostrerà prodotti nella stessa categoria)
        </p>
      </SectionAnimation>

      {/* ─── Sticky buy bar (mobile only) ────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-2">
          <div className="shrink-0">
            <p className="text-lg font-bold leading-tight">{formatPrice(currentPrice)}</p>
            {hasDiscount && (
              <p className="text-xs leading-tight text-muted-foreground line-through">
                {formatPrice(product.compareAtPrice!)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!inStock}
            className="flex-1 rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 neon-glow"
          >
            {inStock ? "Aggiungi al carrello" : "Non disponibile"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Scroll Animation Wrapper ────────────────────────────────────

function SectionAnimation({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`animate-in fade-in slide-in-from-bottom-4 duration-700 ${className}`}
    >
      {children}
    </div>
  );
}
