import { describe, it, expect } from "vitest";
import {
  prestashopImagePath,
  prestashopImageUrl,
  prestashopCategoryImageUrl,
  prestashopBrandImageUrl,
  prestashopLogoUrl,
  extractImgUrls,
  rewriteImgUrls,
  computeCoverFirstSortOrders,
  storagePathForProduct,
  storagePathForCategory,
  storagePathForBrand,
  storagePathForCms,
  contentTypeFor,
} from "../image-utils";

describe("prestashopImagePath", () => {
  it("splits every digit into a subfolder (4-digit id)", () => {
    expect(prestashopImagePath(1320)).toBe("1/3/2/0/1320.jpg");
  });

  it("splits every digit into a subfolder (5-digit id)", () => {
    expect(prestashopImagePath(15658)).toBe("1/5/6/5/8/15658.jpg");
  });

  it("accepts string ids", () => {
    expect(prestashopImagePath("1320")).toBe("1/3/2/0/1320.jpg");
  });
});

describe("URL builders", () => {
  it("builds product image URL without trailing slash duplication", () => {
    expect(prestashopImageUrl("https://www.infografstore.it/", 1320)).toBe(
      "https://www.infografstore.it/img/p/1/3/2/0/1320.jpg"
    );
    expect(prestashopImageUrl("https://www.infografstore.it", 1320)).toBe(
      "https://www.infografstore.it/img/p/1/3/2/0/1320.jpg"
    );
  });

  it("builds category image URL (flat path)", () => {
    expect(prestashopCategoryImageUrl("https://www.infografstore.it", 2)).toBe(
      "https://www.infografstore.it/img/c/2.jpg"
    );
  });

  it("builds brand logo URL (flat path)", () => {
    expect(prestashopBrandImageUrl("https://www.infografstore.it", 5)).toBe(
      "https://www.infografstore.it/img/m/5.jpg"
    );
  });

  it("builds store logo URL", () => {
    expect(prestashopLogoUrl("https://www.infografstore.it")).toBe(
      "https://www.infografstore.it/img/logo.jpg"
    );
  });
});

describe("extractImgUrls", () => {
  const html = `
    <img src="https://www.infografstore.it/img/cms/garanzia.jpeg" />
    <img src="https://www.infografstore.it/img/cms/spedizione-gratuita.png" />
    <p>Text</p>
    <img src="https://www.infografstore.it/img/cms/garanzia.jpeg" />
    <a href="https://example.com/img/other.jpg">external</a>
  `;

  it("extracts distinct image URLs under /img/", () => {
    const urls = extractImgUrls(html, "https://www.infografstore.it");
    expect(urls).toHaveLength(2);
    expect(urls).toContain("https://www.infografstore.it/img/cms/garanzia.jpeg");
    expect(urls).toContain("https://www.infografstore.it/img/cms/spedizione-gratuita.png");
  });

  it("excludes external domains when baseUrl is provided", () => {
    const urls = extractImgUrls(html, "https://www.infografstore.it");
    expect(urls.some((u) => u.includes("example.com"))).toBe(false);
  });

  it("returns empty array for empty input", () => {
    expect(extractImgUrls("", "https://www.infografstore.it")).toEqual([]);
    expect(extractImgUrls(null as unknown as string, "https://www.infografstore.it")).toEqual([]);
  });
});

describe("rewriteImgUrls", () => {
  it("rewrites known URLs and leaves the rest untouched", () => {
    const map = new Map([
      ["https://www.infografstore.it/img/cms/garanzia.jpeg", "https://xyz.supabase.co/storage/v1/object/public/product-images/cms/garanzia.jpeg"],
    ]);
    const html = '<img src="https://www.infografstore.it/img/cms/garanzia.jpeg" /><p>ok</p>';
    const out = rewriteImgUrls(html, map);
    expect(out).toContain("https://xyz.supabase.co/storage/v1/object/public/product-images/cms/garanzia.jpeg");
    expect(out).toContain("<p>ok</p>");
    expect(out).not.toContain("www.infografstore.it");
  });

  it("returns input unchanged when map is empty", () => {
    const html = "<img src='https://www.infografstore.it/img/cms/x.png' />";
    expect(rewriteImgUrls(html, new Map())).toBe(html);
  });

  it("returns empty string for null input", () => {
    expect(rewriteImgUrls(null as unknown as string, new Map([["a", "b"]]))).toBe("");
  });
});

describe("computeCoverFirstSortOrders", () => {
  it("keeps cover-first when cover is already position 1", () => {
    const orders = computeCoverFirstSortOrders([
      { id: 1321, position: 1, cover: 1 },
      { id: 1322, position: 2, cover: null },
      { id: 1323, position: 3, cover: null },
    ]);
    expect(orders.get(1321)).toBe(0);
    expect(orders.get(1322)).toBe(1);
    expect(orders.get(1323)).toBe(2);
  });

  it("promotes the cover image when it is NOT at position 1", () => {
    // Real PrestaShop pattern: cover can be at a later position
    const orders = computeCoverFirstSortOrders([
      { id: 100, position: 1, cover: null },
      { id: 200, position: 2, cover: 1 },
      { id: 300, position: 3, cover: null },
    ]);
    expect(orders.get(200)).toBe(0); // cover promoted
    expect(orders.get(100)).toBe(1); // position order preserved
    expect(orders.get(300)).toBe(2);
  });

  it("handles products without a cover image", () => {
    const orders = computeCoverFirstSortOrders([
      { id: 1, position: 1, cover: null },
      { id: 2, position: 2, cover: null },
    ]);
    expect(orders.get(1)).toBe(0);
    expect(orders.get(2)).toBe(1);
  });

  it("assigns sequential sort orders (no gaps)", () => {
    const orders = computeCoverFirstSortOrders([
      { id: 10, position: 5, cover: null },
      { id: 20, position: 1, cover: 1 },
      { id: 30, position: 3, cover: null },
    ]);
    expect(orders.get(20)).toBe(0); // cover first
    expect(orders.get(30)).toBe(1); // then position 3
    expect(orders.get(10)).toBe(2); // then position 5
    expect([...orders.values()].sort()).toEqual([0, 1, 2]);
  });
});

describe("storage paths", () => {
  it("builds product storage path", () => {
    expect(storagePathForProduct(281, 1320)).toBe("products/281/1320.jpg");
  });

  it("builds category storage path", () => {
    expect(storagePathForCategory(2)).toBe("categories/2.jpg");
  });

  it("builds brand storage path", () => {
    expect(storagePathForBrand(5)).toBe("brands/5.jpg");
  });

  it("builds CMS storage path without double prefix", () => {
    expect(storagePathForCms("cms/garanzia.jpeg")).toBe("cms/garanzia.jpeg");
    expect(storagePathForCms("garanzia.jpeg")).toBe("cms/garanzia.jpeg");
    expect(storagePathForCms("cms/sub/banner.png")).toBe("cms/sub/banner.png");
  });
});

describe("contentTypeFor", () => {
  it("maps common image extensions", () => {
    expect(contentTypeFor("x.jpg")).toBe("image/jpeg");
    expect(contentTypeFor("x.jpeg")).toBe("image/jpeg");
    expect(contentTypeFor("x.png")).toBe("image/png");
    expect(contentTypeFor("x.webp")).toBe("image/webp");
    expect(contentTypeFor("x.svg")).toBe("image/svg+xml");
    expect(contentTypeFor("x.ico")).toBe("image/x-icon");
  });

  it("falls back to octet-stream for unknown extensions", () => {
    expect(contentTypeFor("x.bin")).toBe("application/octet-stream");
    expect(contentTypeFor("noext")).toBe("application/octet-stream");
  });
});
