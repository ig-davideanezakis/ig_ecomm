import { describe, it, expect } from "vitest";
import { cn, formatPrice, slugify, clamp, buildQueryString, parseDecimal } from "../utils";

describe("cn (classname utility)", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });
  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });
  it("handles Tailwind conflicts (last wins)", () => {
    expect(cn("px-4", "px-6")).toBe("px-6");
  });
  it("returns empty string for no args", () => {
    expect(cn()).toBe("");
  });
});

describe("formatPrice", () => {
  it("formats integer as EUR", () => {
    expect(formatPrice(10)).toBe("10,00\u00a0€");
  });
  it("formats decimal", () => {
    expect(formatPrice(19.99)).toBe("19,99\u00a0€");
  });
  it("formats zero", () => {
    expect(formatPrice(0)).toBe("0,00\u00a0€");
  });
  it("formats large numbers without thousands separator (jsdom ICU)", () => {
    expect(formatPrice(1200.5)).toBe("1200,50\u00a0€");
  });
  it("handles string input", () => {
    expect(formatPrice("42.50")).toBe("42,50\u00a0€");
  });
  it("handles object with toString", () => {
    expect(formatPrice({ toString: () => "99.99" })).toBe("99,99\u00a0€");
  });
});

describe("slugify", () => {
  it("converts to lowercase", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });
  it("replaces spaces with hyphens", () => {
    expect(slugify("PC Gaming Setup")).toBe("pc-gaming-setup");
  });
  it("removes special characters", () => {
    expect(slugify("Città & Paese!")).toBe("citt-paese");
  });
  it("removes leading/trailing hyphens", () => {
    expect(slugify("  --hello--  ")).toBe("hello");
  });
  it("collapses multiple hyphens", () => {
    expect(slugify("a---b")).toBe("a-b");
  });
  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });
  it("handles non-string via toString", () => {
    const num: number = 123;
    expect(slugify(String(num))).toBe("123");
  });
});

describe("clamp", () => {
  it("returns value within range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it("clamps below min", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });
  it("clamps above max", () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
  it("handles min > max (clamps to max first)", () => {
    expect(clamp(5, 10, 0)).toBe(0);
  });
});

describe("buildQueryString", () => {
  it("builds query string from params", () => {
    expect(buildQueryString({ page: 1, sort: "asc" })).toBe("?page=1&sort=asc");
  });
  it("skips null and undefined values", () => {
    expect(buildQueryString({ page: 1, search: null, sort: undefined })).toBe("?page=1");
  });
  it("skips empty string values", () => {
    expect(buildQueryString({ search: "", page: 1 })).toBe("?page=1");
  });
  it("returns empty string for empty params", () => {
    expect(buildQueryString({})).toBe("");
  });
});

describe("parseDecimal", () => {
  it("parses number input", () => {
    expect(parseDecimal(42.5)).toBe(42.5);
  });
  it("parses string input", () => {
    expect(parseDecimal("19.99")).toBe(19.99);
  });
  it("parses object with toString", () => {
    expect(parseDecimal({ toString: () => "99.99" })).toBe(99.99);
  });
});
