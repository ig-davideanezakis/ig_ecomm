import { describe, it, expect, vi, beforeEach } from "vitest";

const { authorizeMock, queryMock, syncAutoFilterValuesMock } = vi.hoisted(() => ({
  authorizeMock: vi.fn(),
  queryMock: vi.fn(),
  syncAutoFilterValuesMock: vi.fn(),
}));

vi.mock("@/lib/auth-helpers", () => ({ authorize: authorizeMock }));
vi.mock("@/lib/db", () => ({ pool: { query: queryMock } }));
vi.mock("@/lib/filter-values", () => ({ syncAutoFilterValues: syncAutoFilterValuesMock }));

import { PUT } from "./route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/products/prod1", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function callPut(body: unknown, id = "prod1") {
  return PUT(makeRequest(body), { params: Promise.resolve({ id }) });
}

const validProduct = { title: "Notebook Test", basePrice: 999, barcode: "12345678" };

describe("PUT /api/admin/products/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authorizeMock.mockResolvedValue({ id: "admin1", role: "ADMIN", email: "a@a.it" });
    queryMock.mockResolvedValue({ rows: [] });
    syncAutoFilterValuesMock.mockResolvedValue(undefined);
  });

  it("resyncs auto-filter values from the updated specifications after the UPDATE", async () => {
    const res = await callPut({ ...validProduct, specifications: "[{\"group\":\"CPU\"}]" });
    expect(res.status).toBe(200);

    expect(queryMock).toHaveBeenCalledTimes(1); // the UPDATE
    expect(syncAutoFilterValuesMock).toHaveBeenCalledWith(
      expect.anything(),
      "prod1",
      "[{\"group\":\"CPU\"}]",
    );
  });

  it("does not sync filter values when validation fails", async () => {
    const res = await callPut({ title: "" });
    expect(res.status).toBe(400);
    expect(queryMock).not.toHaveBeenCalled();
    expect(syncAutoFilterValuesMock).not.toHaveBeenCalled();
  });
});
