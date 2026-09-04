import { describe, it, expect } from "vitest";
import {
  productSchema,
  pageSchema,
  checkoutSchema,
  registerSchema,
  resetPasswordSchema,
  forgotPasswordSchema,
  validate,
} from "../validation";

describe("productSchema", () => {
  it("validates a valid product", () => {
    const result = productSchema.safeParse({
      title: "PC Gaming",
      basePrice: 999.99,
      barcode: "4719512030394",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = productSchema.safeParse({ title: "", basePrice: 10, barcode: "4719512030394" });
    expect(result.success).toBe(false);
  });

  it("rejects negative price", () => {
    const result = productSchema.safeParse({ title: "Test", basePrice: -5, barcode: "4719512030394" });
    expect(result.success).toBe(false);
  });

  it("allows zero price", () => {
    const result = productSchema.safeParse({ title: "Test", basePrice: 0, barcode: "4719512030394" });
    expect(result.success).toBe(true);
  });

  it("applies default values", () => {
    const result = productSchema.parse({ title: "Test", basePrice: 50, barcode: "4719512030394" });
    expect(result.published).toBe(false);
    expect(result.featured).toBe(false);
    expect(result.description).toBe("");
    expect(result.content).toBe("");
  });

  it("accepts optional fields", () => {
    const result = productSchema.safeParse({
      title: "Test",
      basePrice: 50,
      sku: "PC-001",
      barcode: "123456789",
      weight: 2.5,
      featured: true,
      published: true,
      categoryId: "cat-1",
      brandId: "brand-1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a product without a GTIN (EAN/UPC)", () => {
    const result = productSchema.safeParse({ title: "Test", basePrice: 10 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("obbligatorio");
  });

  it("rejects malformed GTIN values (letters, too short, too long)", () => {
    for (const bad of ["471951203039A", "1234567", "123456789012345", "  ", "ean-123456789"]) {
      const result = productSchema.safeParse({ title: "Test", basePrice: 10, barcode: bad });
      expect(result.success).toBe(false);
    }
  });

  it("accepts every GTIN length (8/12/13/14 digits) and trims spaces", () => {
    for (const barcode of ["12345678", "471163645441", "4719512030394", "12345678901234", "  4719512030394  "]) {
      const result = productSchema.safeParse({ title: "Test", basePrice: 10, barcode });
      expect(result.success).toBe(true);
    }
  });
});

describe("pageSchema", () => {
  it("validates a valid page", () => {
    const result = pageSchema.safeParse({ title: "Chi siamo", slug: "chi-siamo" });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = pageSchema.safeParse({ title: "", slug: "test" });
    expect(result.success).toBe(false);
  });

  it("rejects empty slug", () => {
    const result = pageSchema.safeParse({ title: "Test", slug: "" });
    expect(result.success).toBe(false);
  });

  it("applies defaults", () => {
    const result = pageSchema.parse({ title: "Test", slug: "test" });
    expect(result.published).toBe(true);
    expect(result.navOrder).toBe(0);
    expect(result.footerOrder).toBe(0);
  });
});

describe("checkoutSchema", () => {
  it("validates a valid checkout", () => {
    const result = checkoutSchema.safeParse({
      items: [{ productId: "p1", variantId: "v1", title: "Prod", price: 50, quantity: 1 }],
      email: "test@example.com",
      name: "Mario Rossi",
      address: "Via Roma 1",
      city: "Palermo",
      zip: "90100",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty cart", () => {
    const result = checkoutSchema.safeParse({
      items: [],
      email: "test@test.com",
      name: "Mario",
      address: "Via Roma",
      city: "Palermo",
      zip: "90100",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = checkoutSchema.safeParse({
      items: [{ productId: "p1", variantId: "v1", title: "Prod", price: 50, quantity: 1 }],
      email: "not-an-email",
      name: "Mario",
      address: "Via Roma",
      city: "Palermo",
      zip: "90100",
    });
    expect(result.success).toBe(false);
  });
});

describe("auth schemas", () => {
  it("registerSchema: valid", () => {
    expect(registerSchema.safeParse({ email: "a@b.com", password: "123456" }).success).toBe(true);
  });
  it("registerSchema: short password", () => {
    expect(registerSchema.safeParse({ email: "a@b.com", password: "123" }).success).toBe(false);
  });
  it("registerSchema: invalid email", () => {
    expect(registerSchema.safeParse({ email: "bad", password: "123456" }).success).toBe(false);
  });

  it("forgotPasswordSchema: valid", () => {
    expect(forgotPasswordSchema.safeParse({ email: "a@b.com" }).success).toBe(true);
  });

  it("resetPasswordSchema: valid", () => {
    const result = resetPasswordSchema.safeParse({
      token: "tok123",
      email: "a@b.com",
      password: "newpass",
    });
    expect(result.success).toBe(true);
  });
});

describe("validate helper", () => {
  it("returns success with data", () => {
    const result = validate(productSchema, { title: "Test", basePrice: 10, barcode: "4719512030394" });
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it("returns error on failure", () => {
    const result = validate(productSchema, { title: "" });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
