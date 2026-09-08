import { describe, it, expect, vi, beforeEach } from "vitest";

const { queryMock, hashMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  hashMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ pool: { query: queryMock } }));
vi.mock("bcryptjs", () => ({ default: { hash: hashMock }, hash: hashMock }));

import { POST } from "./route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/auth/register-from-order", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/register-from-order", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hashMock.mockResolvedValue("hashed-password");
  });

  it("rejects a missing order number without querying the database", async () => {
    const res = await POST(makeRequest({ password: "secret1" }));
    expect(res.status).toBe(400);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("rejects a password shorter than 6 characters", async () => {
    const res = await POST(makeRequest({ orderNumber: "ORD-1", password: "abc" }));
    expect(res.status).toBe(400);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown order number", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] }); // order lookup
    const res = await POST(makeRequest({ orderNumber: "ORD-UNKNOWN", password: "secret1" }));
    expect(res.status).toBe(404);
  });

  it("derives the email from the order — a client-supplied email cannot hijack another order", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ billing_email: "real@customer.it", billing_name: "Real Customer" }] }) // order lookup
      .mockResolvedValueOnce({ rows: [] }) // existing user check
      .mockResolvedValueOnce({ rows: [{ id: "user1" }] }) // insert user
      .mockResolvedValueOnce({}); // link guest orders

    const res = await POST(
      makeRequest({ orderNumber: "ORD-1", password: "secret1", email: "attacker@evil.com" }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, userId: "user1" });

    expect(queryMock.mock.calls[1][1]).toEqual(["real@customer.it"]); // existing-user check
    expect(queryMock.mock.calls[2][1][0]).toBe("real@customer.it"); // insert uses the order's email
    expect(queryMock.mock.calls[3][1][1]).toBe("real@customer.it"); // guest-order linking
  });

  it("reports alreadyExists without creating a duplicate account", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ billing_email: "real@customer.it", billing_name: null }] }) // order lookup
      .mockResolvedValueOnce({ rows: [{ id: "existing" }] }); // existing user check

    const res = await POST(makeRequest({ orderNumber: "ORD-1", password: "secret1" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, alreadyExists: true });
    expect(queryMock).toHaveBeenCalledTimes(2);
  });
});
