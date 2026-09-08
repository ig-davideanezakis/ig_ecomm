import { describe, it, expect, vi, beforeEach } from "vitest";

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));
vi.mock("@/lib/db", () => ({ pool: { query: queryMock } }));

import { getProductList } from "../products";

function mockListResponses() {
  queryMock
    .mockResolvedValueOnce({ rows: [{ total: 0 }] }) // count
    .mockResolvedValueOnce({ rows: [] }) // products
    .mockResolvedValueOnce({ rows: [] }) // categories
    .mockResolvedValueOnce({ rows: [] }); // brands
}

describe("getProductList — dynamic filters (f_<slug>=value)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("adds no EXISTS clause and passes only base params when no filters are selected", async () => {
    mockListResponses();
    await getProductList({});

    const [countSql, countParams] = queryMock.mock.calls[0];
    expect(countSql).not.toContain("product_filter_value");
    expect(countParams).toEqual([]); // published-only condition has no params
  });

  it("filters products by a single selected value via product_filter_value", async () => {
    mockListResponses();
    await getProductList({ filters: { cpu: ["Intel Core i7"] } });

    const [countSql, countParams] = queryMock.mock.calls[0];
    expect(countSql).toContain("EXISTS");
    expect(countSql).toContain('"product_filter_value" pfv');
    expect(countSql).toContain("f.slug = $1");
    expect(countSql).toContain("pfv.value = ANY($2)");
    expect(countParams).toEqual(["cpu", ["Intel Core i7"]]);
  });

  it("combines multiple filters (AND across filters) with price range and search", async () => {
    mockListResponses();
    await getProductList({
      search: "zenbook",
      minPrice: 500,
      filters: { cpu: ["Intel Core i7"], ram: ["16 GB", "32 GB"] },
    });

    const [countSql, countParams] = queryMock.mock.calls[0];
    // search ($1), minPrice ($2), then cpu (slug $3, values $4), ram (slug $5, values $6)
    expect(countParams).toEqual(["%zenbook%", 500, "cpu", ["Intel Core i7"], "ram", ["16 GB", "32 GB"]]);
    expect(countSql.match(/EXISTS/g)?.length).toBe(2);
  });

  it("ignores a filter with an empty value array", async () => {
    mockListResponses();
    await getProductList({ filters: { cpu: [] } });

    const [countSql, countParams] = queryMock.mock.calls[0];
    expect(countSql).not.toContain("product_filter_value");
    expect(countParams).toEqual([]);
  });
});
