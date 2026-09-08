import { describe, it, expect, vi, beforeEach } from "vitest";

const { authorizeMock, clientMock, poolConnectMock } = vi.hoisted(() => ({
  authorizeMock: vi.fn(),
  clientMock: { query: vi.fn(), release: vi.fn() },
  poolConnectMock: vi.fn(),
}));

vi.mock("@/lib/auth-helpers", () => ({ authorize: authorizeMock }));
vi.mock("@/lib/db", () => ({ pool: { connect: poolConnectMock } }));

import { PUT } from "./route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/products/prod1/filter-values", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function callPut(body: unknown, id = "prod1") {
  return PUT(makeRequest(body), { params: Promise.resolve({ id }) });
}

describe("PUT /api/admin/products/[id]/filter-values", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authorizeMock.mockResolvedValue({ id: "admin1", role: "ADMIN", email: "a@a.it" });
    poolConnectMock.mockResolvedValue(clientMock);
    clientMock.query.mockResolvedValue({});
  });

  it("rejects a request without filterId", async () => {
    const res = await callPut({ value: "x" });
    expect(res.status).toBe(400);
    expect(poolConnectMock).not.toHaveBeenCalled();
  });

  it("sets a manual filter's value directly (isOverride=false)", async () => {
    clientMock.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ value_mode: "manual" }] }) // filter lookup
      .mockResolvedValueOnce({}) // DELETE
      .mockResolvedValueOnce({}) // INSERT
      .mockResolvedValueOnce({}); // COMMIT

    const res = await callPut({ filterId: "f1", value: "Nero" });
    expect(res.status).toBe(200);

    const insertCall = clientMock.query.mock.calls[3];
    expect(insertCall[0]).toContain("INSERT INTO");
    expect(insertCall[1]).toEqual(["prod1", "f1", "Nero", false]);
  });

  it("sets an auto filter's override value (isOverride=true)", async () => {
    clientMock.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ value_mode: "auto" }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    await callPut({ filterId: "f1", value: "Intel Core i9" });

    const insertCall = clientMock.query.mock.calls[3];
    expect(insertCall[1]).toEqual(["prod1", "f1", "Intel Core i9", true]);
  });

  it("clears the value when an empty string is sent", async () => {
    clientMock.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ value_mode: "manual" }] })
      .mockResolvedValueOnce({}) // DELETE
      .mockResolvedValueOnce({}); // COMMIT

    await callPut({ filterId: "f1", value: "" });

    expect(clientMock.query).toHaveBeenCalledTimes(4); // BEGIN, lookup, DELETE, COMMIT — no INSERT
    expect(clientMock.query.mock.calls[2][0]).toContain("DELETE FROM");
  });

  it("rejects reset on a manual filter", async () => {
    clientMock.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ value_mode: "manual" }] });

    const res = await callPut({ filterId: "f1", reset: true });
    expect(res.status).toBe(400);
    expect(clientMock.query.mock.calls.some((c) => c[0] === "ROLLBACK")).toBe(true);
  });

  it("re-derives an auto filter's value on reset", async () => {
    clientMock.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ value_mode: "auto" }] }) // filter lookup
      .mockResolvedValueOnce({}) // DELETE
      .mockResolvedValueOnce({ rows: [{ specifications: "[]" }] }) // product lookup
      .mockResolvedValueOnce({ rows: [] }) // syncAutoFilterValues: SELECT auto filters
      .mockResolvedValueOnce({}); // COMMIT

    const res = await callPut({ filterId: "f1", reset: true });
    expect(res.status).toBe(200);
    expect(clientMock.query.mock.calls[3][0]).toContain("SELECT specifications");
  });

  it("returns 404 when the filter does not exist", async () => {
    clientMock.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [] });

    const res = await callPut({ filterId: "missing", value: "x" });
    expect(res.status).toBe(404);
  });
});
