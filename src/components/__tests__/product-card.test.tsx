import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductCard } from "@/components/shop/product-card";

// next/image needs the remote pattern config; in jsdom a plain <img> is enough
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={props.src} alt={props.alt} />
  ),
}));

const baseProduct = {
  id: "p1",
  identifier: "PROD-1",
  title: "Monitor Test",
  slug: "monitor-test",
  description: null,
  compareAtPrice: null,
  featured: false,
  createdAt: "2026-01-01",
  images: [],
  category: null,
  brand: null,
};

describe("ProductCard — price display", () => {
  it("shows the base price when the product has no variants", () => {
    render(<ProductCard product={{ ...baseProduct, basePrice: 299, variants: [] }} />);
    expect(screen.getByText("299,00 €")).toBeInTheDocument();
  });

  it("shows the base price when the only variant is the legacy 'Default' with price 0", () => {
    // Regression: PrestaShop-migrated products carry a Default variant at €0
    render(
      <ProductCard
        product={{
          ...baseProduct,
          basePrice: 768,
          variants: [{ id: "v1", name: "Default", price: 0, stock: 5 }],
        }}
      />,
    );
    expect(screen.getByText("768,00 €")).toBeInTheDocument();
    expect(screen.queryByText("0,00 €")).not.toBeInTheDocument();
  });

  it("shows the lowest real variant price when variants are priced", () => {
    render(
      <ProductCard
        product={{
          ...baseProduct,
          basePrice: 300,
          variants: [
            { id: "v1", name: "16GB", price: 300, stock: 5 },
            { id: "v2", name: "32GB", price: 340, stock: 5 },
          ],
        }}
      />,
    );
    expect(screen.getByText("300,00 €")).toBeInTheDocument();
    expect(screen.getByText("+1 varianti")).toBeInTheDocument();
  });
});
