import { describe, it, expect } from "vitest";
import { previewMetaTitle, previewMetaDescription } from "../seo-generator";

describe("previewMetaTitle", () => {
  it("formats short title with store suffix", () => {
    expect(previewMetaTitle("PC Gaming")).toBe("PC Gaming | Infograf Store");
  });

  it("truncates long titles to 60 chars including suffix", () => {
    const long = "Il miglior PC gaming per appassionati di videogiochi e professionisti";
    const result = previewMetaTitle(long);
    expect(result.length).toBeLessThanOrEqual(65);
    expect(result).toContain("Infograf Store");
    expect(result).toContain("…");
  });

  it("handles empty title", () => {
    expect(previewMetaTitle("").endsWith("Infograf Store")).toBe(true);
  });
});

describe("previewMetaDescription", () => {
  it("cleans HTML tags", () => {
    expect(previewMetaDescription("<strong>PC</strong> da gaming")).toBe("PC da gaming");
  });

  it("truncates long descriptions at word boundary", () => {
    const long = "A".repeat(200);
    const result = previewMetaDescription(long);
    expect(result.length).toBeLessThanOrEqual(165);
    expect(result.endsWith("…")).toBe(true);
  });

  it("returns short text unchanged", () => {
    expect(previewMetaDescription("Ciao mondo")).toBe("Ciao mondo");
  });

  it("returns fallback for empty input", () => {
    expect(previewMetaDescription("")).toBe("Scopri i prodotti Infograf Store.");
  });

  it("handles HTML-only input", () => {
    expect(previewMetaDescription("<br/>")).toBe("Scopri i prodotti Infograf Store.");
  });
});
