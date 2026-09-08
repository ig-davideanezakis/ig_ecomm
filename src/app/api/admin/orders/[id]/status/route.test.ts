import { describe, it, expect, vi, beforeEach } from "vitest";

const { authorizeMock, clientMock, poolConnectMock, poolQueryMock } = vi.hoisted(() => ({
  authorizeMock: vi.fn(),
  clientMock: { query: vi.fn(), release: vi.fn() },
  poolConnectMock: vi.fn(),
  poolQueryMock: vi.fn(),
}));

vi.mock("@/lib/auth-helpers", () => ({ authorize: authorizeMock }));
vi.mock("@/lib/db", () => ({ pool: { connect: poolConnectMock, query: poolQueryMock } }));

import { PUT } from "./route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/orders/order1/status", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function callPut(body: unknown, id = "order1") {
  return PUT(makeRequest(body), { params: Promise.resolve({ id }) });
}

describe("PUT /api/admin/orders/[id]/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authorizeMock.mockResolvedValue(undefined);
    poolConnectMock.mockResolvedValue(clientMock);
    poolQueryMock.mockResolvedValue({});
    clientMock.query.mockResolvedValue({}); // fallback for ROLLBACK/COMMIT calls not explicitly queued
  });

  it("rejects unauthenticated/non-admin requests before touching the database", async () => {
    authorizeMock.mockRejectedValue(new Error("Unauthorized"));
    const res = await callPut({ status: "CONFIRMED" });
    expect(res.status).toBe(401);
    expect(poolConnectMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid transition", async () => {
    clientMock.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: "order1", status: "DELIVERED" }] }); // order lookup

    const res = await callPut({ status: "CANCELLED" });
    expect(res.status).toBe(400);
    expect(clientMock.query.mock.calls.some((c) => c[0] === "ROLLBACK")).toBe(true);
    expect(poolQueryMock).not.toHaveBeenCalled(); // no audit log written on a rejected transition
  });

  it("restores the reserved stock when an order is cancelled", async () => {
    clientMock.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: "order1", status: "CONFIRMED" }] }) // order lookup
      .mockResolvedValueOnce({}) // UPDATE order status
      .mockResolvedValueOnce({}) // UPDATE product_variant stock restore
      .mockResolvedValueOnce({}); // COMMIT

    const res = await callPut({ status: "CANCELLED" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, from: "CONFIRMED", to: "CANCELLED" });

    const stockRestore = clientMock.query.mock.calls[3];
    expect(stockRestore[0]).toContain("stock = stock + order_item.quantity");
    expect(stockRestore[1]).toEqual(["order1"]);
    expect(clientMock.query.mock.calls[4][0]).toBe("COMMIT");
    expect(clientMock.release).toHaveBeenCalledTimes(1);

    // Best-effort audit log runs after commit, outside the transaction.
    expect(poolQueryMock).toHaveBeenCalledTimes(1);
  });

  it("does not touch stock for a non-cancelling transition", async () => {
    clientMock.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: "order1", status: "PENDING" }] }) // order lookup
      .mockResolvedValueOnce({}) // UPDATE order status
      .mockResolvedValueOnce({}); // COMMIT

    const res = await callPut({ status: "CONFIRMED" });
    expect(res.status).toBe(200);
    expect(clientMock.query).toHaveBeenCalledTimes(4); // BEGIN, order lookup, status update, COMMIT — no stock query
  });

  it("rolls back and releases the client when the database throws", async () => {
    clientMock.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockRejectedValueOnce(new Error("connection lost"));

    const res = await callPut({ status: "CONFIRMED" });
    expect(res.status).toBe(500);
    expect(clientMock.query.mock.calls.some((c) => c[0] === "ROLLBACK")).toBe(true);
    expect(clientMock.release).toHaveBeenCalledTimes(1);
  });
});
