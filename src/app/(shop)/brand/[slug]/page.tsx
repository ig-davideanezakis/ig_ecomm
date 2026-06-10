import { getProductList } from "@/db/queries";
import { ProductCard, type ProductCardData } from "@/components/shop/product-card";
import { notFound } from "next/navigation";
import { pool } from "@/lib/db";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; page?: string; [key: string]: string | undefined }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const brand = await pool.query(`SELECT name, description FROM "brand" WHERE slug = $1`, [slug]);
  if (!brand.rows[0]) return { title: "Brand non trovato — Infograf Store" };
  return {
    title: `${brand.rows[0].name} — Infograf Store`,
    description: brand.rows[0].description || `Scopri tutti i prodotti ${brand.rows[0].name} su Infograf Store.`,
  };
}

export default async function BrandPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolved = await searchParams;

  const brand = await pool.query(`SELECT * FROM "brand" WHERE slug = $1`, [slug]);
  if (!brand.rows[0]) notFound();

  const data = await getProductList({
    brand: slug,
    sort: resolved.sort?.trim() || "newest",
    page: Math.max(1, Number(resolved.page) || 1),
    limit: 12,
  });

  const b = brand.rows[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Brand header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        {b.logo && (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border bg-white dark:bg-black p-3">
            <img src={b.logo} alt={b.name} className="h-full w-auto object-contain" />
          </div>
        )}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{b.name}</h1>
          {b.description && <p className="mt-2 text-muted-foreground max-w-2xl">{b.description}</p>}
          <p className="mt-1 text-sm text-muted-foreground">
            {data.pagination.total} prodotti
            {b.website && <> &middot; <a href={b.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Sito ufficiale</a></>}
          </p>
        </div>
      </div>

      {/* Products grid */}
      {data.products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-muted-foreground">Nessun prodotto trovato per questa marca.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {data.products.map((product, i) => (
            <li key={product.id}>
              <ProductCard product={product as ProductCardData} priority={i < 6} />
            </li>
          ))}
        </ul>
      )}

      {data.pagination.totalPages > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-1">
          {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1).map(p => (
            <a key={p} href={`/brand/${slug}?page=${p}`}
              className={`inline-flex h-9 w-9 items-center justify-center rounded text-sm ${
                p === data.pagination.page ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}>{p}</a>
          ))}
        </nav>
      )}
    </div>
  );
}
