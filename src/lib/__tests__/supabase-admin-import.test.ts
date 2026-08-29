import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock supabase-js before importing the module under test
const uploadMock = vi.fn();
const getPublicUrlMock = vi.fn();
const listBucketsMock = vi.fn();
const createBucketMock = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    storage: {
      listBuckets: listBucketsMock,
      createBucket: createBucketMock,
      from: vi.fn(() => ({
        upload: uploadMock,
        getPublicUrl: getPublicUrlMock,
      })),
    },
  })),
}));

import {
  extFromContentType,
  importImageFromUrl,
  importImagesFromUrls,
  validateImageSource,
} from "@/lib/supabase-admin";

// 1x1 red PNG — real image so sharp can process it
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function pngResponse(byteLength?: number, headers: Record<string, string> = {}) {
  const base = Buffer.from(TINY_PNG_BASE64, "base64");
  const buf = byteLength && byteLength > base.length ? Buffer.concat([base, Buffer.alloc(byteLength - base.length)]) : base;
  return new Response(buf, { status: 200, headers: { "content-type": "image/png", ...headers } });
}

describe("extFromContentType", () => {
  it("maps allowed content types to extensions", () => {
    expect(extFromContentType("image/jpeg")).toBe("jpg");
    expect(extFromContentType("image/png")).toBe("png");
    expect(extFromContentType("image/webp")).toBe("webp");
    expect(extFromContentType("image/avif")).toBe("avif");
  });

  it("ignores charset parameters and casing", () => {
    expect(extFromContentType("IMAGE/JPEG; charset=utf-8")).toBe("jpg");
  });

  it("rejects unsupported types", () => {
    expect(extFromContentType("text/html")).toBeNull();
    expect(extFromContentType("image/gif")).toBeNull();
    expect(extFromContentType("")).toBeNull();
  });
});

describe("validateImageSource", () => {
  it("accepts an allowed image under the 20MB download guard", () => {
    expect(validateImageSource("image/jpeg", 1024)).toBeNull();
    // Icecat high-res photos are commonly 6-15MB
    expect(validateImageSource("image/jpeg", 11 * 1024 * 1024)).toBeNull();
  });

  it("rejects unsupported content types", () => {
    expect(validateImageSource("text/html", 1024)).toMatch(/Formato non supportato/);
  });

  it("rejects sources over 20MB", () => {
    expect(validateImageSource("image/png", 21 * 1024 * 1024)).toMatch(/troppo grande/);
  });
});

describe("importImageFromUrl", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-key");
    vi.stubGlobal("fetch", fetchMock);
    listBucketsMock.mockResolvedValue({ data: [{ name: "product-images" }], error: null });
    uploadMock.mockResolvedValue({ error: null });
    getPublicUrlMock.mockReturnValue({ data: { publicUrl: "https://test.supabase.co/storage/v1/object/public/product-images/products/p1/123.webp" } });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("downloads, downscales to WebP and uploads to the classic path products/{productId}/...", async () => {
    fetchMock.mockResolvedValue(pngResponse());

    const url = await importImageFromUrl("https://images.icecat.biz/img/gallery/photo.png", "p123");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://images.icecat.biz/img/gallery/photo.png",
      expect.objectContaining({ signal: expect.anything(), redirect: "follow" }),
    );
    const uploadCall = uploadMock.mock.calls[0];
    expect(uploadCall[0]).toMatch(/^products\/p123\/\d+-[a-z0-9]{6}\.webp$/);
    expect(uploadCall[1]).toBeInstanceOf(Buffer);
    // sharp output is WebP regardless of the input format
    expect(uploadCall[2]).toEqual(expect.objectContaining({ contentType: "image/webp", cacheControl: "31536000" }));
    expect(url).toBe("https://test.supabase.co/storage/v1/object/public/product-images/products/p1/123.webp");
  });

  it("accepts sources up to 20MB (Icecat high-res photos)", { timeout: 15000 }, async () => {
    // 6MB: just over the old 5MB upload limit, proving the fix for real Icecat photos
    fetchMock.mockResolvedValue(pngResponse(6 * 1024 * 1024));

    await expect(importImageFromUrl("https://images.icecat.biz/big.png", "p1")).resolves.toBeTruthy();
    expect(uploadMock).toHaveBeenCalledTimes(1);
  });

  it("throws when the download fails", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 404, headers: { "content-type": "application/json" } }));

    await expect(importImageFromUrl("https://images.icecat.biz/missing.jpg", "p1")).rejects.toThrow(/HTTP 404/);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("throws when the content type is not an allowed image", async () => {
    fetchMock.mockResolvedValue(
      new Response("<html>nope</html>", { status: 200, headers: { "content-type": "text/html" } }),
    );

    await expect(importImageFromUrl("https://images.icecat.biz/evil.html", "p1")).rejects.toThrow(/Formato non supportato/);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("throws when the source exceeds the 20MB guard", async () => {
    fetchMock.mockResolvedValue(pngResponse(21 * 1024 * 1024));

    await expect(importImageFromUrl("https://images.icecat.biz/too-big.png", "p1")).rejects.toThrow(/troppo grande/);
    expect(uploadMock).not.toHaveBeenCalled();
  });
});

describe("importImagesFromUrls", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("imports all images and collects per-item errors without aborting", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(pngResponse())
      .mockResolvedValueOnce(pngResponse())
      .mockResolvedValueOnce(new Response("bad", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    listBucketsMock.mockResolvedValue({ data: [{ name: "product-images" }], error: null });
    uploadMock.mockResolvedValue({ error: null });
    getPublicUrlMock.mockReturnValue({ data: { publicUrl: "https://test.supabase.co/obj.webp" } });

    const result = await importImagesFromUrls(
      [
        { url: "https://images.icecat.biz/a.png", alt: "A" },
        { url: "https://images.icecat.biz/b.png" },
        { url: "https://images.icecat.biz/c.png" },
      ],
      "p9",
    );

    expect(result.imported).toHaveLength(2);
    // input order is preserved (gallery sort_order depends on it)
    expect(result.imported[0]).toEqual({ url: expect.stringContaining("/obj.webp"), alt: "A" });
    expect(result.imported[1]).toEqual({ url: expect.stringContaining("/obj.webp"), alt: "" });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].url).toBe("https://images.icecat.biz/c.png");
  });
});
