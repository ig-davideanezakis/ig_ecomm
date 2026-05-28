import Link from "next/link";
import { formatPrice, parseDecimal } from "@/lib/utils";

export interface ProductCardData {
  id: string;
  identifier: string;
  title: string;
  slug: string;
  description: string | null;
  basePrice: number;
  compareAtPrice: number | null;
  featured: boolean;
  createdAt: string;
  images: Array<{ id: string; url: string; alt: string | null; sortOrder: number }>;
  variants: Array<{ id: string; name: string; price: number; stock: number }>;
  category: { id: string; name: string; slug: string } | null;
  brand: { id: string; name: string; slug: string } | null;
}

interface ProductCardProps {
  product: ProductCardData;
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const image = product.images?.[0];
  const lowestPrice = product.variants?.length
    ? Math.min(...product.variants.map((v) => v.price))
    : product.basePrice;
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > lowestPrice;

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_15px_rgba(255,12,60,0.15)]"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {image ? (
          <img
            src={image.url}
            alt={image.alt ?? product.title}
            width={400}
            height={400}
            loading={priority ? "eager" : "lazy"}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}

        {/* Discount badge */}
        {hasDiscount && (
          <div className="absolute left-2 top-2 rounded bg-primary px-2 py-0.5 text-xs font-bold text-white">
            -{Math.round(((1 - lowestPrice / product.compareAtPrice!) * 100))}%
          </div>
        )}

        {/* Featured badge */}
        {product.featured && !hasDiscount && (
          <div className="absolute left-2 top-2 rounded bg-primary/90 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
            In evidenza
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {product.brand && (
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {product.brand.name}
          </span>
        )}
        <h3 className="font-semibold leading-tight text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {product.title}
        </h3>
        {product.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {product.description}
          </p>
        )}

        <div className="mt-auto pt-2 flex items-baseline gap-2">
          <span className="text-lg font-bold text-foreground">
            {formatPrice(lowestPrice)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(product.compareAtPrice!)}
            </span>
          )}
          {product.variants?.length > 1 && (
            <span className="text-xs text-muted-foreground ml-auto">
              +{product.variants.length - 1} varianti
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
