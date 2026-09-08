import { describe, it, expect } from "vitest";
import { buildProductsPageHref } from "../page";

describe("buildProductsPageHref", () => {
  it("keeps search, category, brand and sort while changing the page", () => {
    const href = buildProductsPageHref(
      { search: "rtx", category: "gpu", brand: "asus", sort: "price_asc", page: "1" },
      3,
    );
    const url = new URL(href, "http://localhost");
    expect(url.pathname).toBe("/products");
    expect(url.searchParams.get("search")).toBe("rtx");
    expect(url.searchParams.get("category")).toBe("gpu");
    expect(url.searchParams.get("brand")).toBe("asus");
    expect(url.searchParams.get("sort")).toBe("price_asc");
    expect(url.searchParams.get("page")).toBe("3");
  });

  it("preserves multi-value dynamic filters (f_*)", () => {
    const href = buildProductsPageHref({ f_color: ["red", "blue"], page: "1" }, 2);
    const url = new URL(href, "http://localhost");
    expect(url.searchParams.getAll("f_color")).toEqual(["red", "blue"]);
    expect(url.searchParams.get("page")).toBe("2");
  });

  it("drops undefined params and always overrides page", () => {
    const href = buildProductsPageHref({ search: undefined, page: "5" }, 1);
    const url = new URL(href, "http://localhost");
    expect(url.searchParams.has("search")).toBe(false);
    expect(url.searchParams.get("page")).toBe("1");
  });
});
