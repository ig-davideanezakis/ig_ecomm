import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatCompactCurrency,
  formatDate,
  formatShortDate,
  getStatusColor,
} from "../helpers";

describe("formatCurrency", () => {
  it("formats integer as EUR", () => {
    expect(formatCurrency(10)).toContain("10");
    expect(formatCurrency(10)).toContain("€");
  });

  it("formats decimal as EUR", () => {
    const result = formatCurrency(1499.99);
    expect(result).toContain("1499");
    expect(result).toContain("€");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toContain("0");
    expect(formatCurrency(0)).toContain("€");
  });

  it("includes euro symbol", () => {
    expect(formatCurrency(1000000)).toContain("€");
  });

  it("returns a string", () => {
    expect(typeof formatCurrency(42)).toBe("string");
  });
});

describe("formatCompactCurrency", () => {
  it("formats small numbers", () => {
    const result = formatCompactCurrency(10);
    expect(result).toContain("10");
    expect(result).toContain("€");
  });

  it("formats thousands compactly", () => {
    const result = formatCompactCurrency(1500);
    expect(result).toContain("€");
  });

  it("formats millions compactly", () => {
    const result = formatCompactCurrency(1000000);
    expect(result).toContain("€");
  });
});

describe("formatDate", () => {
  it("formats a Date object", () => {
    const date = new Date("2026-05-28T14:30:00");
    const result = formatDate(date);
    expect(result).toContain("28");
    expect(result).toContain("05");
    expect(result).toContain("2026");
    expect(result).toContain("14");
    expect(result).toContain("30");
  });

  it("formats a date string", () => {
    const result = formatDate("2026-05-28T14:30:00");
    expect(result).toContain("28");
    expect(result).toContain("05");
    expect(result).toContain("2026");
  });

  it("formats different date", () => {
    const result = formatDate("2026-01-01T09:00:00");
    expect(result).toContain("01");
    expect(result).toContain("2026");
    expect(result).toContain("09");
  });
});

describe("formatShortDate", () => {
  it("formats as day + short month", () => {
    const result = formatShortDate("2026-05-28");
    expect(result).toMatch(/28/);
  });

  it("works with ISO strings", () => {
    const result = formatShortDate("2026-01-01T00:00:00");
    expect(result).toBeTruthy();
  });
});

describe("getStatusColor", () => {
  it("returns yellow for PENDING", () => {
    expect(getStatusColor("PENDING")).toContain("yellow");
  });

  it("returns green for DELIVERED", () => {
    expect(getStatusColor("DELIVERED")).toContain("green");
  });

  it("returns red for CANCELLED", () => {
    expect(getStatusColor("CANCELLED")).toContain("red");
  });

  it("returns blue for CONFIRMED", () => {
    expect(getStatusColor("CONFIRMED")).toContain("blue");
  });

  it("returns indigo for PROCESSING", () => {
    expect(getStatusColor("PROCESSING")).toContain("indigo");
  });

  it("returns purple for SHIPPED", () => {
    expect(getStatusColor("SHIPPED")).toContain("purple");
  });

  it("returns gray fallback for unknown status", () => {
    expect(getStatusColor("UNKNOWN")).toContain("gray");
  });
});
