import { describe, it, expect, vi, beforeEach } from "vitest";

const { authorizeMock, queryMock, syncAutoFilterValuesMock } = vi.hoisted(() => ({
  authorizeMock: vi.fn(),
  queryMock: vi.fn(),
  syncAutoFilterValuesMock: vi.fn(),
}));

vi.mock("@/lib/auth-helpers", () => ({ authorize: authorizeMock }));
vi.mock("@/lib/db", () => ({ pool: { query: queryMock } }));
vi.mock("@/lib/filter-values", () => ({ syncAutoFilterValues: syncAutoFilterValuesMock }));

import { GET, POST } from "./route";

function makeRequest(query: string) {
  return new Request(`http://localhost/api/admin/products?${query}`) as unknown as import("next/server").NextRequest;
}

function makePostRequest(body: unknown) {
  return new Request("http://localhost/api/admin/products", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validProduct = { title: "Notebook Test", basePrice: 999, barcode: "12345678" };

function mockListResponses() {
  queryMock
    .mockResolvedValueOnce({ rows: [{ total: 0 }] }) // count
    .mockResolvedValueOnce({ rows: [] }) // products
    .mockResolvedValueOnce({ rows: [] }) // categories
    .mockResolvedValueOnce({ rows: [] }); // brands
}

describe("GET /api/admin/products", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authorizeMock.mockResolvedValue({ id: "admin1", role: "ADMIN", email: "a@a.it" });
  });

  it("returns 401 without querying the database when not an admin", async () => {
    authorizeMock.mockRejectedValue(new Error("Unauthorized"));
    const res = await GET(makeRequest(""));
    expect(res.status).toBe(401);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("searches by substring across title, identifier, SKU, EAN/barcode and Icecat code", async () => {
    mockListResponses();
    await GET(makeRequest("search=abc123"));

    const [countSql, countParams] = queryMock.mock.calls[0];
    expect(countSql).toContain("p.title ILIKE $1");
    expect(countSql).toContain("p.identifier ILIKE $1");
    expect(countSql).toContain("p.sku ILIKE $1");
    expect(countSql).toContain("p.barcode ILIKE $1");
    expect(countSql).toContain("p.icecat_code ILIKE $1");
    expect(countParams).toEqual(["%abc123%"]); // substring match, not exact/prefix
  });

  it("combines search with category, brand and status filters", async () => {
    mockListResponses();
    await GET(makeRequest("search=abc&category=laptop&brand=asus&status=published"));

    const [countSql, countParams] = queryMock.mock.calls[0];
    expect(countSql).toContain("c.slug = $2");
    expect(countSql).toContain("b.slug = $3");
    expect(countSql).toContain("p.published = true");
    expect(countParams).toEqual(["%abc%", "laptop", "asus"]);
  });

  it("paginates with the requested page/limit", async () => {
    mockListResponses();
    const res = await GET(makeRequest("page=2&limit=10"));
    const json = await res.json();

    const [, listParams] = queryMock.mock.calls[1];
    expect(listParams.slice(-2)).toEqual([10, 10]); // LIMIT 10 OFFSET 10 (page 2)
    expect(json.pagination).toMatchObject({ page: 2, limit: 10 });
  });
});

describe("POST /api/admin/products", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authorizeMock.mockResolvedValue({ id: "admin1", role: "ADMIN", email: "a@a.it" });
  });

  it("syncs auto-filter values from the new product's specifications after insert", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: "prod1" }] }); // INSERT ... RETURNING id
    syncAutoFilterValuesMock.mockResolvedValue(undefined);

    const res = await POST(makePostRequest({ ...validProduct, specifications: "[]" }));
    expect(res.status).toBe(200);

    expect(syncAutoFilterValuesMock).toHaveBeenCalledWith(expect.anything(), "prod1", "[]");
  });

  it("does not touch filter values when creation fails validation", async () => {
    const res = await POST(makePostRequest({ title: "" })); // missing required fields
    expect(res.status).toBe(400);
    expect(syncAutoFilterValuesMock).not.toHaveBeenCalled();
  });
});
