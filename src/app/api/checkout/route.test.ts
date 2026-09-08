import { describe, it, expect, vi, beforeEach } from "vitest";

const { authMock, clientMock, poolConnectMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  clientMock: { query: vi.fn(), release: vi.fn() },
  poolConnectMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/db", () => ({ pool: { connect: poolConnectMock } }));

import { POST } from "./route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  items: [{ productId: "p1", variantId: "v1", title: "Prodotto", price: 999, quantity: 2 }],
  email: "buyer@example.com",
  name: "Mario Rossi",
  address: "Via Roma 1",
  city: "Palermo",
  zip: "90100",
};

describe("POST /api/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue(null);
    poolConnectMock.mockResolvedValue(clientMock);
    clientMock.query.mockResolvedValue({}); // fallback for ROLLBACK/COMMIT calls not explicitly queued
  });

  it("rejects an empty cart without touching the database", async () => {
    const res = await POST(makeRequest({ ...validPayload, items: [] }));
    expect(res.status).toBe(400);
    expect(poolConnectMock).not.toHaveBeenCalled();
  });

  it("prices the order from the server-side variant lookup, ignoring a manipulated client price", async () => {
    clientMock.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ price: "999.00", stock: 5 }] }) // variant lookup (locked)
      .mockResolvedValueOnce({ rows: [{ id: "order1", order_number: "ORD-1" }] }) // order insert
      .mockResolvedValueOnce({}) // order_item insert
      .mockResolvedValueOnce({}) // stock decrement
      .mockResolvedValueOnce({}); // COMMIT

    const tamperedPayload = { ...validPayload, items: [{ ...validPayload.items[0], price: 0.01 }] };
    const res = await POST(makeRequest(tamperedPayload));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.order.total).toBe((999 * 2).toFixed(2)); // real price used, not the tampered 0.01

    const orderInsert = clientMock.query.mock.calls[2];
    expect(orderInsert[1][2]).toBe((999 * 2).toFixed(2)); // subtotal param
    const itemInsert = clientMock.query.mock.calls[3];
    expect(itemInsert[1][1]).toBe("999.00"); // unit_price param — DB price, not the client's

    expect(clientMock.query.mock.calls[0][0]).toBe("BEGIN");
    expect(clientMock.query.mock.calls[5][0]).toBe("COMMIT");
    expect(clientMock.release).toHaveBeenCalledTimes(1);
  });

  it("rolls back with 409 when stock is insufficient for the requested quantity", async () => {
    clientMock.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ price: "999.00", stock: 1 }] }); // stock < quantity(2)

    const res = await POST(makeRequest(validPayload));
    expect(res.status).toBe(409);
    expect(clientMock.query.mock.calls.some((c) => c[0] === "ROLLBACK")).toBe(true);
    expect(clientMock.release).toHaveBeenCalledTimes(1);
  });

  it("rolls back with 400 when the variant/product pair does not exist", async () => {
    clientMock.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [] }); // variant not found

    const res = await POST(makeRequest(validPayload));
    expect(res.status).toBe(400);
    expect(clientMock.query.mock.calls.some((c) => c[0] === "ROLLBACK")).toBe(true);
    expect(clientMock.release).toHaveBeenCalledTimes(1);
  });

  it("rolls back and releases the client when the database throws mid-transaction", async () => {
    clientMock.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockRejectedValueOnce(new Error("connection lost"));

    const res = await POST(makeRequest(validPayload));
    expect(res.status).toBe(500);
    expect(clientMock.query.mock.calls.some((c) => c[0] === "ROLLBACK")).toBe(true);
    expect(clientMock.release).toHaveBeenCalledTimes(1);
  });
});
