import { describe, expect, it } from "vitest";
import { effectiveVariantPrice, lowestDisplayPrice } from "@/lib/product-price";

describe("effectiveVariantPrice", () => {
  it("uses the variant price when set (> 0)", () => {
    expect(effectiveVariantPrice(499.9, 599)).toBe(499.9);
  });

  it("falls back to the base price when the variant price is 0 (legacy Default variants)", () => {
    expect(effectiveVariantPrice(0, 768)).toBe(768);
  });

  it("falls back for negative prices too", () => {
    expect(effectiveVariantPrice(-1, 100)).toBe(100);
  });
});

describe("lowestDisplayPrice", () => {
  it("returns the base price when there are no variants", () => {
    expect(lowestDisplayPrice([], 299)).toBe(299);
    expect(lowestDisplayPrice(null, 299)).toBe(299);
  });

  it("returns the lowest variant price when variants are priced", () => {
    expect(lowestDisplayPrice([{ price: 299 }, { price: 259 }], 299)).toBe(259);
  });

  it("falls back to the base price when every variant price is 0", () => {
    expect(lowestDisplayPrice([{ price: 0 }, { price: 0 }], 768)).toBe(768);
  });

  it("mixes priced and zero variants (zero ones inherit the base)", () => {
    expect(lowestDisplayPrice([{ price: 0 }, { price: 500 }], 768)).toBe(500);
  });
});
