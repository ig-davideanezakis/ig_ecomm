"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";

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
}

// ─── Main Component ───────────────────────────────────────────────

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants?.[0] ?? null,
  );
  const [selectedImage, setSelectedImage] = useState(0);

  const currentPrice = selectedVariant?.price ?? product.basePrice;
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
    // TODO: integrate with cart
    alert("Aggiunto al carrello!");
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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

      <div className="grid gap-8 lg:grid-cols-2">
        {/* ─── Images ───────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Main image */}
          <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
            {images[selectedImage] ? (
              <img
                src={images[selectedImage].url}
                alt={images[selectedImage].alt ?? product.title}
                className="h-full w-full object-cover transition-transform duration-500"
                width={800}
                height={800}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
            )}

            {/* Badges */}
            <div className="absolute left-3 top-3 flex flex-col gap-2">
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
            </div>
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(i)}
                  className={`relative aspect-square w-20 shrink-0 overflow-hidden rounded-md border-2 transition-all ${
                    i === selectedImage
                      ? "border-primary"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <img
                    src={img.url}
                    alt={img.alt ?? `${product.title} ${i + 1}`}
                    className="h-full w-full object-cover"
                    width={80}
                    height={80}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

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

          {/* Stock status */}
          <div className="flex items-center gap-2 text-sm">
            {inStock ? (
              <>
                <span className="h-2 w-2 rounded-full bg-success" />
                <span className="text-success font-medium">
                  Disponibile
                </span>
                {isLowStock && (
                  <span className="text-warning text-xs">
                    (solo {selectedVariant!.stock} rimasti)
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-destructive" />
                <span className="text-destructive font-medium">
                  Esaurito
                </span>
              </>
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

          {/* Highlights */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Pagamenti sicuri
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              Garanzia 24 mesi
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="M12 5l7 7-7 7" />
              </svg>
              Assistenza tecnica
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
              Spedizione rapida
            </div>
          </div>
        </div>
      </div>

      {/* ─── Rich HTML Content ──────────────────────────────────── */}
      {product.content && (
        <SectionAnimation className="mt-16">
          <div className="mx-auto max-w-3xl">
            <div
              className="product-rich-content"
              dangerouslySetInnerHTML={{ __html: product.content }}
            />
          </div>
        </SectionAnimation>
      )}

      {/* ─── Related Products (placeholder) ─────────────────────── */}
      <SectionAnimation className="mt-20">
        <h2 className="mb-8 text-2xl font-bold">Prodotti correlati</h2>
        <p className="text-muted-foreground">
          (Da implementare — mostrerà prodotti nella stessa categoria)
        </p>
      </SectionAnimation>
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
