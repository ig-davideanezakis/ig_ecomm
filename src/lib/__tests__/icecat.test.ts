import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  lookupProductByEan,
  parseBrand,
  parseBulletPoints,
  parseCategoryHint,
  parseDescriptions,
  parseDimensions,
  parseImages,
  parseSpecs,
  parseWeight,
} from "@/lib/icecat";

/**
 * Fixture mirroring the real Icecat Live API response shape
 * (verified against live.icecat.biz/api for EAN 4711636454414).
 */
const generalInfo = {
  Title: 'ASUS ROG Strix OLED XG34WCDMS Monitor PC 86,4 cm (34") 3440 x 1440 Pixel UltraWide Quad HD QD-OLED Nero',
  Brand: "ASUS",
  BrandLogo: "https://images.icecat.biz/img/brand/thumb/161_logo.jpg",
  SummaryDescription: {
    ShortSummaryDescription: "ASUS ROG Strix OLED XG34WCDMS, 86,4 cm (34\"), 3440 x 1440 Pixel, QD-OLED",
    LongSummaryDescription: "ASUS ROG Strix OLED XG34WCDMS. Dettagliata descrizione lunga del prodotto.",
  },
  BulletPoints: {
    BulletPointsId: "17588411",
    Language: "EN",
    Values: ["34-inch WQHD QD-OLED 1800R monitor", "0.03ms GTG response time"],
  },
  GeneratedBulletPoints: {
    Language: "EN",
    Values: ["86.4 cm (34\") Black", "Maximum refresh rate: 280 Hz"],
  },
  ProductFamily: { ProductFamilyID: "76682", Value: "ROG Strix OLED", Language: "EN" },
  Category: { CategoryID: "222", Name: { Value: "Monitor PC", Language: "IT" } },
};

const featureGroups = [
  {
    ID: 100,
    FeatureGroup: { ID: "5", Name: { Value: "Display", Language: "IT" } },
    Features: [
      {
        Type: "numerical",
        PresentationValue: '86,4 cm (34")',
        Value: "34",
        Feature: { ID: "944", Name: { Value: "Dimensioni diagonale schermo", Language: "IT" } },
      },
      {
        Type: "text",
        PresentationValue: "280 Hz",
        Value: "280",
        Feature: { ID: "945", Name: { Value: "Frequenza massima di aggiornamento", Language: "IT" } },
      },
    ],
  },
  {
    ID: 107,
    FeatureGroup: { ID: "7", Name: { Value: "Dimensioni e peso", Language: "IT" } },
    Features: [
      {
        PresentationValue: "Sì",
        Value: "Y",
        Feature: { Name: { Value: "Regolazione altezza", Language: "IT" } },
      },
      {
        PresentationValue: "5,7 kg",
        Value: "5.7",
        Feature: { Name: { Value: "Peso (senza supporto)", Language: "IT" } },
      },
      {
        PresentationValue: "8,2 kg",
        Value: "8.2",
        Feature: { Name: { Value: "Peso dell'imballo", Language: "IT" } },
      },
      {
        // Must NOT count as weight: it is a box dimension, not a "peso".
        PresentationValue: "85,0 cm",
        Value: "85.0",
        Feature: { Name: { Value: "Larghezza imballo", Language: "IT" } },
      },
      {
        PresentationValue: "80,7 cm",
        Value: "80.7",
        Feature: { Name: { Value: "Larghezza (senza supporto)", Language: "IT" } },
      },
      {
        PresentationValue: "36,3 cm",
        Value: "36.3",
        Feature: { Name: { Value: "Altezza (senza supporto)", Language: "IT" } },
      },
      {
        PresentationValue: "15,6 cm",
        Value: "15.6",
        Feature: { Name: { Value: "Profondità (senza supporto)", Language: "IT" } },
      },
      {
        PresentationValue: "",
        Value: "",
        Feature: { Name: { Value: "Campo vuoto", Language: "IT" } },
      },
    ],
  },
];

const data = {
  GeneralInfo: generalInfo,
  Image: {
    HighPic: "https://images.icecat.biz/img/gallery/main_high.jpg",
    Pic: "https://images.icecat.biz/img/gallery/main_pic.jpg",
    LowPic: "https://images.icecat.biz/img/gallery/main_low.jpg",
  },
  Gallery: [
    {
      ID: "1",
      Pic500x500: "https://images.icecat.biz/img/gallery/500_1.jpg",
      Pic: "https://images.icecat.biz/img/gallery/1.jpg",
      LowPic: "https://images.icecat.biz/img/gallery_lows/1.jpg",
    },
    {
      ID: "2",
      Pic500x500: "https://images.icecat.biz/img/gallery/500_2.jpg",
      Pic: "https://images.icecat.biz/img/gallery/2.jpg",
      LowPic: "https://images.icecat.biz/img/gallery_lows/2.jpg",
    },
  ],
  FeaturesGroups: featureGroups,
  ReasonsToBuy: [
    { ID: "1", Name: { Value: "Ultra-veloce: 0,03 ms di risposta" } },
  ],
};

describe("parseDescriptions", () => {
  it("extracts short and long descriptions from SummaryDescription", () => {
    const { short, long } = parseDescriptions(generalInfo);
    expect(short).toContain("ASUS ROG Strix OLED XG34WCDMS");
    expect(long).toContain("Dettagliata descrizione lunga");
  });

  it("returns empty strings when SummaryDescription is missing", () => {
    expect(parseDescriptions({})).toEqual({ short: "", long: "" });
  });
});

describe("parseBrand", () => {
  it("handles a plain string brand", () => {
    expect(parseBrand({ Brand: "ASUS" })).toBe("ASUS");
  });

  it("handles an object brand with Name", () => {
    expect(parseBrand({ Brand: { Id: 161, Name: "ASUS" } })).toBe("ASUS");
  });

  it("returns empty string when brand is missing", () => {
    expect(parseBrand({})).toBe("");
  });
});

describe("parseWeight", () => {
  it("prefers the packaged weight over the without-stand weight", () => {
    expect(parseWeight(featureGroups)).toBe(8.2);
  });

  it("ignores box dimensions whose name contains 'imballo'", () => {
    const groups = [
      {
        Features: [
          { PresentationValue: "85,0 cm", Value: "85.0", Feature: { Name: { Value: "Larghezza imballo" } } },
          { PresentationValue: "10,3 kg", Value: "10.3", Feature: { Name: { Value: "Peso dell'imballo" } } },
        ],
      },
    ];
    expect(parseWeight(groups)).toBe(10.3);
  });

  it("parses Italian comma decimals", () => {
    const groups = [
      { Features: [{ PresentationValue: "5,7 kg", Value: "5.7", Feature: { Name: { Value: "Peso" } } }] },
    ];
    expect(parseWeight(groups)).toBe(5.7);
  });

  it("converts raw gram values to kg when no localized value exists", () => {
    const groups = [
      { Features: [{ Value: "5200", Feature: { Name: { Value: "Peso" } } }] },
    ];
    expect(parseWeight(groups)).toBe(5.2);
  });

  it("returns null when no weight feature exists", () => {
    expect(parseWeight([{ Features: [{ PresentationValue: "34", Feature: { Name: { Value: "Diagonale" } } }] }])).toBeNull();
  });
});

describe("parseDimensions", () => {
  it("extracts width, height and depth, skipping control features", () => {
    const dims = parseDimensions(featureGroups);
    expect(dims.width).toBe("80,7 cm");
    expect(dims.height).toBe("36,3 cm");
    expect(dims.depth).toBe("15,6 cm");
  });

  it("does not treat 'Regolazione altezza: Sì' as a height", () => {
    const groups = [
      { Features: [{ PresentationValue: "Sì", Feature: { Name: { Value: "Regolazione altezza" } } }] },
    ];
    expect(parseDimensions(groups).height).toBe("");
  });

  it("returns empty strings when no dimension features exist", () => {
    expect(parseDimensions([])).toEqual({ width: "", height: "", depth: "" });
  });
});

describe("parseSpecs", () => {
  it("flattens feature groups into label/value pairs", () => {
    const specs = parseSpecs(featureGroups);
    expect(specs).toHaveLength(9);
    expect(specs.find((s) => s.label === "Dimensioni diagonale schermo")).toEqual({
      label: "Dimensioni diagonale schermo",
      value: '86,4 cm (34")',
    });
    expect(specs.find((s) => s.label === "Profondità (senza supporto)")).toEqual({
      label: "Profondità (senza supporto)",
      value: "15,6 cm",
    });
  });

  it("skips features without a value", () => {
    const specs = parseSpecs(featureGroups);
    expect(specs.some((s) => s.label === "Campo vuoto")).toBe(false);
  });
});

describe("parseImages", () => {
  it("collects the main image first, then one URL per gallery photo, deduping", () => {
    const images = parseImages(data, generalInfo.Title, "ASUS");
    expect(images).toHaveLength(3);
    expect(images[0].url).toBe("https://images.icecat.biz/img/gallery/main_high.jpg");
    expect(images[0].alt).toContain("ASUS");
    expect(images[1].url).toBe("https://images.icecat.biz/img/gallery/500_1.jpg");
    expect(images[2].url).toBe("https://images.icecat.biz/img/gallery/500_2.jpg");
    const urls = images.map((i) => i.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("returns an empty array when no images exist", () => {
    expect(parseImages({}, "T", "B")).toEqual([]);
  });
});

describe("parseBulletPoints", () => {
  it("uses BulletPoints.Values when present", () => {
    const bullets = parseBulletPoints(generalInfo, data);
    expect(bullets).toContain("34-inch WQHD QD-OLED");
    expect(bullets).toContain("0.03ms GTG");
  });

  it("falls back to GeneratedBulletPoints when BulletPoints is empty", () => {
    const gi = { ...generalInfo, BulletPoints: {} };
    const bullets = parseBulletPoints(gi, data);
    expect(bullets).toContain("Maximum refresh rate");
  });

  it("falls back to ReasonsToBuy when no bullet points exist", () => {
    const gi = { ...generalInfo, BulletPoints: {}, GeneratedBulletPoints: {} };
    const bullets = parseBulletPoints(gi, data);
    expect(bullets).toContain("Ultra-veloce");
  });

  it("returns empty string when nothing is available", () => {
    expect(parseBulletPoints({}, {})).toBe("");
  });
});

describe("parseCategoryHint", () => {
  it("prefers ProductFamily.Value", () => {
    expect(parseCategoryHint(generalInfo)).toBe("ROG Strix OLED");
  });

  it("falls back to Category.Name.Value", () => {
    expect(parseCategoryHint({ Category: { Name: { Value: "Monitor PC" } } })).toBe("Monitor PC");
  });

  it("returns empty string when both are missing", () => {
    expect(parseCategoryHint({})).toBe("");
  });
});

describe("lookupProductByEan", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    mockFetch.mockReset();
  });

  it("aggregates the full product data for an EAN", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data }),
    });

    const result = await lookupProductByEan("4711636454414");

    expect(result.found).toBe(true);
    expect(result.title).toContain("XG34WCDMS");
    expect(result.brand).toBe("ASUS");
    expect(result.brandLogo).toContain("images.icecat.biz");
    expect(result.shortDesc).toContain("ASUS ROG Strix OLED");
    expect(result.longDesc).toContain("Dettagliata descrizione lunga");
    expect(result.weight).toBe(8.2);
    expect(result.dimensions.width).toBe("80,7 cm");
    expect(result.specs.length).toBe(9);
    expect(result.images.length).toBe(3);
    expect(result.bulletPoints).toContain("34-inch WQHD QD-OLED");
    expect(result.categoryHint).toBe("ROG Strix OLED");
    expect(result.ean).toBe("4711636454414");

    // The request URL must include the EAN and credentials.
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("ean_upc=4711636454414");
    expect(url).toContain("UserName=");
    expect(url).toContain("ContentReader=");
  });

  it("throws Product not found when GeneralInfo.Title is empty", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { GeneralInfo: { Title: "" } } }),
    });
    await expect(lookupProductByEan("0000000000000")).rejects.toThrow("Product not found");
  });

  it("throws when the API returns a non-OK response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });
    await expect(lookupProductByEan("4711636454414")).rejects.toThrow("Icecat API 401");
  });
});
