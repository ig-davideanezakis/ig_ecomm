import { describe, it, expect, vi, beforeEach } from "vitest";

const { authorizeMock, clientMock, poolConnectMock } = vi.hoisted(() => ({
  authorizeMock: vi.fn(),
  clientMock: {
    query: vi.fn(),
    release: vi.fn(),
  },
  poolConnectMock: vi.fn(),
}));

vi.mock("@/lib/auth-helpers", () => ({ authorize: authorizeMock }));
vi.mock("@/lib/db", () => ({ pool: { connect: poolConnectMock } }));

import { POST } from "./route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/product-images/reorder", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/product-images/reorder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authorizeMock.mockResolvedValue(undefined);
    poolConnectMock.mockResolvedValue(clientMock);
    clientMock.query.mockReset();
    clientMock.release.mockReset();
  });

  it("rejects when not authorized", async () => {
    authorizeMock.mockRejectedValue(new Error("Unauthorized"));

    await expect(
      POST(makeRequest({ productId: "p1", images: [{ id: "img1", sortOrder: 0 }] })),
    ).rejects.toThrow("Unauthorized");
    expect(poolConnectMock).not.toHaveBeenCalled();
  });

  it("rejects requests without productId", async () => {
    const res = await POST(makeRequest({ images: [{ id: "img1", sortOrder: 0 }] }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("productId") });
  });

  it("rejects requests without images", async () => {
    const res = await POST(makeRequest({ productId: "p1", images: [] }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("Nessuna immagine") });
  });

  it("rejects more than 100 images", async () => {
    const images = Array.from({ length: 101 }, (_, i) => ({ id: `img${i}`, sortOrder: i }));
    const res = await POST(makeRequest({ productId: "p1", images }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("Troppe immagini") });
  });

  it("rejects malformed items (missing id / non-integer sortOrder)", async () => {
    for (const images of [
      [{ sortOrder: 0 }],
      [{ id: "img1", sortOrder: 1.5 }],
      [{ id: "img1", sortOrder: -1 }],
      [{ id: "img1", sortOrder: "0" }],
    ]) {
      const res = await POST(makeRequest({ productId: "p1", images }));
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ error: expect.stringContaining("Formato non valido") });
    }
  });

  it("updates sort_order for every image inside a transaction", async () => {
    clientMock.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE img1
      .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE img2
      .mockResolvedValueOnce({}); // COMMIT

    const res = await POST(
      makeRequest({
        productId: "p1",
        images: [
          { id: "img1", sortOrder: 0 },
          { id: "img2", sortOrder: 1 },
        ],
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, count: 2 });

    // BEGIN → 2 UPDATEs → COMMIT
    expect(clientMock.query).toHaveBeenCalledTimes(4);
    expect(clientMock.query.mock.calls[0][0]).toBe("BEGIN");
    expect(clientMock.query.mock.calls[3][0]).toBe("COMMIT");
    // UPDATE scoped to the product (never trust the client-provided productId alone)
    const update = clientMock.query.mock.calls[1];
    expect(update[0]).toContain('UPDATE "product_image"');
    expect(update[1]).toEqual([0, "img1", "p1"]);
    expect(clientMock.release).toHaveBeenCalledTimes(1);
  });

  it("rolls back and returns 404 when an image does not belong to the product", async () => {
    clientMock.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rowCount: 0 }); // UPDATE fails

    const res = await POST(makeRequest({ productId: "p1", images: [{ id: "foreign", sortOrder: 0 }] }));
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("non trovata") });
    expect(clientMock.query.mock.calls.some((c) => c[0] === "ROLLBACK")).toBe(true);
    expect(clientMock.release).toHaveBeenCalledTimes(1);
  });

  it("returns 500 when the database throws", async () => {
    clientMock.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockRejectedValueOnce(new Error("connection lost"));

    const res = await POST(makeRequest({ productId: "p1", images: [{ id: "img1", sortOrder: 0 }] }));
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("connection lost") });
    expect(clientMock.query.mock.calls.some((c) => c[0] === "ROLLBACK")).toBe(true);
    expect(clientMock.release).toHaveBeenCalledTimes(1);
  });
});
