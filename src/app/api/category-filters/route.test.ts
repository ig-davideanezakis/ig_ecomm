import { describe, it, expect, vi, beforeEach } from "vitest";

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));
vi.mock("@/lib/db", () => ({ pool: { query: queryMock } }));

import { GET } from "./route";

function makeRequest(query: string) {
  return new Request(`http://localhost/api/category-filters?${query}`) as unknown as import("next/server").NextRequest;
}

describe("GET /api/category-filters", () => {
  beforeEach(() => vi.resetAllMocks());

  it("sources a global auto-mode filter's options from product_filter_value, unscoped, when no category is given", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ id: "f1", slug: "cpu", value_mode: "auto", options: [{ value: "Intel i7" }] }] }); // global filters (no categorySlug -> no other queries)

    const res = await GET(makeRequest(""));
    expect(res.status).toBe(200);

    const [globalSql, globalParams] = queryMock.mock.calls[0];
    expect(globalSql).toContain('"product_filter_value" pfv');
    expect(globalSql).not.toContain('p."category_id" = $1');
    expect(globalParams).toEqual([]);
  });

  it("scopes a global auto-mode filter's options to the category's products when one is given", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ id: "cat1", parent_id: null }] }) // category lookup by slug
      .mockResolvedValueOnce({ rows: [] }) // global filters
      .mockResolvedValueOnce({ rows: [{ id: "cat1", parent_id: null, name: "Laptop", slug: "laptop", depth: 0 }] }) // ancestors
      .mockResolvedValueOnce({ rows: [] }) // category-scoped filters
      .mockResolvedValueOnce({ rows: [{ id: "cat1", name: "Laptop", slug: "laptop" }] }); // final category lookup

    await GET(makeRequest("categorySlug=laptop"));

    const [globalSql, globalParams] = queryMock.mock.calls[1];
    expect(globalSql).toContain('p."category_id" = $1');
    expect(globalParams).toEqual(["cat1"]);
  });

  it("still uses the curated filter_option list for a manual-mode filter", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ id: "f2", slug: "colore", value_mode: "manual", options: [] }] });

    await GET(makeRequest(""));

    const [globalSql] = queryMock.mock.calls[0];
    expect(globalSql).toContain('"filter_option" fo');
  });

  it("only selects filters flagged use_as_filter", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    await GET(makeRequest(""));
    const [globalSql] = queryMock.mock.calls[0];
    expect(globalSql).toContain("f.use_as_filter = true");
  });
});
