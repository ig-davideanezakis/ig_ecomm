import { describe, it, expect, vi, beforeEach } from "vitest";

const { authorizeMock, poolQueryMock, importImagesFromUrlsMock } = vi.hoisted(() => ({
  authorizeMock: vi.fn(),
  poolQueryMock: vi.fn(),
  importImagesFromUrlsMock: vi.fn(),
}));

vi.mock("@/lib/auth-helpers", () => ({ authorize: authorizeMock }));
vi.mock("@/lib/db", () => ({ pool: { query: poolQueryMock } }));
vi.mock("@/lib/supabase-admin", () => ({ importImagesFromUrls: importImagesFromUrlsMock }));

import { POST } from "./route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/import-images", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const ICE_URL = "https://images.icecat.biz/img/gallery/photo.jpg";

describe("POST /api/admin/import-images", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authorizeMock.mockResolvedValue(undefined);
  });

  it("rejects when not authorized", async () => {
    authorizeMock.mockRejectedValue(new Error("Unauthorized"));

    await expect(POST(makeRequest({ productId: "p1", images: [{ url: ICE_URL }] }))).rejects.toThrow("Unauthorized");
    expect(importImagesFromUrlsMock).not.toHaveBeenCalled();
  });

  it("rejects requests without productId", async () => {
    const res = await POST(makeRequest({ images: [{ url: ICE_URL }] }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("productId") });
  });

  it("rejects requests without images", async () => {
    const res = await POST(makeRequest({ productId: "p1", images: [] }));
    expect(res.status).toBe(400);
  });

  it("rejects more than 20 images", async () => {
    const images = Array.from({ length: 21 }, () => ({ url: ICE_URL }));
    const res = await POST(makeRequest({ productId: "p1", images }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("Troppe immagini") });
  });

  it("rejects non-Icecat hosts and non-HTTPS URLs (SSRF guard)", async () => {
    for (const url of ["http://images.icecat.biz/x.jpg", "https://evil.com/x.jpg", "https://169.254.169.254/meta", "not-a-url"]) {
      const res = await POST(makeRequest({ productId: "p1", images: [{ url }] }));
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ error: expect.stringContaining("host non consentito") });
      expect(importImagesFromUrlsMock).not.toHaveBeenCalled();
    }
  });

  it("imports images, persists product_image rows continuing sort_order", async () => {
    importImagesFromUrlsMock.mockResolvedValue({
      imported: [
        { url: "https://supabase.co/img1.jpg", alt: "Foto 1" },
        { url: "https://supabase.co/img2.jpg", alt: "" },
      ],
      errors: [{ url: "https://images.icecat.biz/bad.jpg", error: "Formato non supportato" }],
    });
    poolQueryMock
      .mockResolvedValueOnce({ rows: [{ next_order: 3 }] }) // max sort_order
      .mockResolvedValueOnce({ rows: [{ id: 11, url: "https://supabase.co/img1.jpg", alt: "Foto 1", sort_order: 3 }] })
      .mockResolvedValueOnce({ rows: [{ id: 12, url: "https://supabase.co/img2.jpg", alt: null, sort_order: 4 }] });

    const res = await POST(makeRequest({ productId: "p1", images: [{ url: ICE_URL, alt: "Foto 1" }, { url: ICE_URL }] }));
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.imported).toHaveLength(2);
    expect(json.failedCount).toBe(1);
    expect(json.errors[0].url).toBe("https://images.icecat.biz/bad.jpg");

    // first query = max sort_order, then one INSERT per imported image
    expect(poolQueryMock).toHaveBeenCalledTimes(3);
    const insertCall = poolQueryMock.mock.calls[1];
    expect(insertCall[0]).toContain('INSERT INTO "product_image"');
    expect(insertCall[1]).toEqual(["https://supabase.co/img1.jpg", "Foto 1", 3, "p1"]);
  });

  it("returns 500 when the import helper throws", async () => {
    importImagesFromUrlsMock.mockRejectedValue(new Error("Storage down"));

    const res = await POST(makeRequest({ productId: "p1", images: [{ url: ICE_URL }] }));
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("Storage down") });
  });
});
