import { describe, it, expect } from "vitest";
import {
  buildIcecatSections,
  applyIcecatSelection,
  truncate,
  escapeHtml,
  findBrandMatch,
  findCategoryMatch,
  buildDimensionsRow,
  type IcecatSectionId,
} from "@/lib/icecat-form";
import type { IcecatProductData } from "@/lib/icecat";

const catalog = {
  brands: [{ id: "b1", name: "HP", slug: "hp" }],
  categories: [{ id: "c1", name: "Notebook", slug: "notebook" }],
};

const fullData: IcecatProductData = {
  found: true,
  title: "HP Pavilion 15",
  brand: "HP",
  brandLogo: "https://cdn.icecat.biz/img/brand/hp.jpg",
  ean: "1234567890123",
  categoryHint: "Notebook",
  shortDesc: "Notebook leggero e potente.",
  longDesc: "<p>Descrizione lunga completa.</p>",
  weight: 1.85,
  dimensions: { width: "35.6", height: "2.2", depth: "25.2" },
  images: [
    { url: "https://cdn.icecat.biz/img/1.jpg", alt: "Front" },
    { url: "https://cdn.icecat.biz/img/2.jpg", alt: "" },
  ],
  specs: [
    { label: "CPU", value: "Intel i5" },
    { label: "RAM", value: "16 GB" },
  ],
  bulletPoints: "Sottile e leggero\nBatteria 10 ore",
};

const emptySnapshot = {
  title: "",
  description: "",
  content: "",
  specifications: "",
  weight: "",
  brandId: "",
  categoryId: "",
};

describe("truncate", () => {
  it("keeps short text unchanged", () => {
    expect(truncate("corto")).toBe("corto");
  });

  it("collapses whitespace", () => {
    expect(truncate("a\n  b\t c")).toBe("a b c");
  });

  it("truncates long text with ellipsis", () => {
    const long = "x".repeat(200);
    expect(truncate(long)).toHaveLength(111);
    expect(truncate(long)).toMatch(/…$/);
  });
});

describe("escapeHtml", () => {
  it("escapes HTML special characters", () => {
    expect(escapeHtml(`<b>&"'`)).toBe("&lt;b&gt;&amp;&quot;&#39;");
  });
});

describe("findBrandMatch / findCategoryMatch", () => {
  it("matches case-insensitively by name", () => {
    expect(findBrandMatch("hp", catalog.brands)?.id).toBe("b1");
    expect(findBrandMatch("Hp", catalog.brands)?.id).toBe("b1");
  });

  it("matches by slug", () => {
    expect(findCategoryMatch("notebook", catalog.categories)?.id).toBe("c1");
  });

  it("returns undefined when there is no match", () => {
    expect(findBrandMatch("Dell", catalog.brands)).toBeUndefined();
    expect(findCategoryMatch("", catalog.categories)).toBeUndefined();
  });
});

describe("buildDimensionsRow", () => {
  it("joins width, height and depth", () => {
    expect(buildDimensionsRow({ width: "35.6", height: "2.2", depth: "25.2" })).toEqual({
      label: "Dimensioni (L×A×P)",
      value: "35.6 × 2.2 × 25.2",
    });
  });

  it("returns null when no dimension is present", () => {
    expect(buildDimensionsRow({ width: "", height: "", depth: "" })).toBeNull();
  });
});

describe("buildIcecatSections", () => {
  it("offers all sections with default selection when the form is empty", () => {
    const sections = buildIcecatSections(fullData, emptySnapshot, catalog);
    const ids = sections.map((s) => s.id);
    expect(ids).toEqual([
      "title",
      "shortDesc",
      "longDesc",
      "bulletPoints",
      "specs",
      "weight",
      "images",
      "brand",
      "category",
    ]);
    // Empty form: everything is safe to fill, nothing flagged as conflict.
    expect(sections.every((s) => s.defaultSelected)).toBe(true);
    expect(sections.every((s) => !s.conflict)).toBe(true);
  });

  it("unchecks fields that would overwrite an existing value", () => {
    const snapshot = {
      title: "Titolo esistente",
      description: "",
      content: "",
      specifications: "",
      weight: "",
      brandId: "",
      categoryId: "",
    };
    const sections = buildIcecatSections(fullData, snapshot, catalog);
    const title = sections.find((s) => s.id === "title")!;
    expect(title.conflict).toBe(true);
    expect(title.defaultSelected).toBe(false);

    // Non-destructive additions stay checked.
    const bullets = sections.find((s) => s.id === "bulletPoints")!;
    expect(bullets.defaultSelected).toBe(true);
  });

  it("hides brand and category sections when there is no catalog match", () => {
    const sections = buildIcecatSections(fullData, emptySnapshot, {
      brands: [],
      categories: [],
    });
    const ids = sections.map((s) => s.id);
    expect(ids).not.toContain("brand");
    expect(ids).not.toContain("category");
  });

  it("omits sections whose data is missing", () => {
    const minimal: IcecatProductData = {
      found: true,
      title: "Solo titolo",
      brand: "",
      brandLogo: "",
      ean: "",
      categoryHint: "",
      shortDesc: "",
      longDesc: "",
      weight: null,
      dimensions: { width: "", height: "", depth: "" },
      images: [],
      specs: [],
      bulletPoints: "",
    };
    const sections = buildIcecatSections(minimal, emptySnapshot, catalog);
    expect(sections.map((s) => s.id)).toEqual(["title"]);
  });

  it("flags images preview with the count", () => {
    const sections = buildIcecatSections(fullData, emptySnapshot, catalog);
    const images = sections.find((s) => s.id === "images")!;
    expect(images.preview).toContain("2 immagini");
  });
});

describe("applyIcecatSelection", () => {
  it("applies only the selected sections", () => {
    const selected = new Set<IcecatSectionId>(["title", "shortDesc", "images"]);
    const result = applyIcecatSelection(fullData, selected, emptySnapshot, catalog);
    expect(result.title).toBe("HP Pavilion 15");
    expect(result.description).toBe("Notebook leggero e potente.");
    expect(result.images).toEqual([
      { url: "https://cdn.icecat.biz/img/1.jpg", alt: "Front" },
      { url: "https://cdn.icecat.biz/img/2.jpg", alt: "" },
    ]);
    expect(result.weight).toBeUndefined();
    expect(result.brandId).toBeUndefined();
    expect(result.content).toBeUndefined();
  });

  it("composes content (long desc + bullets) and specs go to the dedicated field", () => {
    const selected = new Set<IcecatSectionId>(["longDesc", "bulletPoints", "specs"]);
    const result = applyIcecatSelection(fullData, selected, emptySnapshot, catalog);
    // Content: long description + bullets only
    expect(result.content).toContain("Descrizione lunga completa.");
    expect(result.content).toContain("<ul>");
    expect(result.content).toContain("<li>Sottile e leggero</li>");
    expect(result.content).toContain("<li>Batteria 10 ore</li>");
    expect(result.content).not.toContain("<h2>Specifiche tecniche</h2>");
    expect(result.content).not.toContain(">CPU</td>");
    // Specifications: dedicated HTML table (dimensions row first)
    expect(result.specifications).toContain("<table");
    expect(result.specifications).toContain(">CPU</td>");
    expect(result.specifications).toContain(">Intel i5</td>");
    expect(result.specifications).toContain("Dimensioni (L×A×P)");
    expect(result.specifications).toContain("35.6 × 2.2 × 25.2");
  });

  it("escapes Icecat HTML in bullets and specs", () => {
    const evil: IcecatProductData = {
      ...fullData,
      longDesc: "",
      bulletPoints: "<script>alert(1)</script>",
      specs: [{ label: "CPU", value: "<img src=x onerror=alert(1)>" }],
    };
    const selected = new Set<IcecatSectionId>(["bulletPoints", "specs"]);
    const result = applyIcecatSelection(evil, selected, emptySnapshot, catalog);
    expect(result.content).not.toContain("<script>");
    expect(result.content).toContain("&lt;script&gt;");
    expect(result.specifications).not.toContain("<img src=x onerror=alert(1)>");
    expect(result.specifications).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("keeps existing content untouched and fills specifications when only specs are selected", () => {
    const snapshot = { ...emptySnapshot, content: "Contenuto attuale" };
    const selected = new Set<IcecatSectionId>(["specs"]);
    const result = applyIcecatSelection(fullData, selected, snapshot, catalog);
    expect(result.content).toBeUndefined(); // content left as-is
    expect(result.specifications).toContain("<table");
    expect(result.specifications).toContain(">CPU</td>");
  });

  it("maps brand and category when selected", () => {
    const selected = new Set<IcecatSectionId>(["brand", "category"]);
    const result = applyIcecatSelection(fullData, selected, emptySnapshot, catalog);
    expect(result.brandId).toBe("b1");
    expect(result.categoryId).toBe("c1");
  });

  it("returns an empty result when nothing is selected", () => {
    const result = applyIcecatSelection(fullData, new Set(), emptySnapshot, catalog);
    expect(result).toEqual({});
  });
});
