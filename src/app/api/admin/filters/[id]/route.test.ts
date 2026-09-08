import { describe, it, expect, vi, beforeEach } from "vitest";

const { authorizeMock, queryMock } = vi.hoisted(() => ({
  authorizeMock: vi.fn(),
  queryMock: vi.fn(),
}));

vi.mock("@/lib/auth-helpers", () => ({ authorize: authorizeMock }));
vi.mock("@/lib/db", () => ({ pool: { query: queryMock } }));

import { PUT } from "./route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/filters/f1", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;
}

function callPut(body: unknown) {
  return PUT(makeRequest(body), { params: Promise.resolve({ id: "f1" }) });
}

describe("PUT /api/admin/filters/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authorizeMock.mockResolvedValue({ id: "admin1", role: "ADMIN", email: "a@a.it" });
  });

  it("blocks editing a system filter", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ is_system: true }] });
    const res = await callPut({ name: "Nuovo nome" });
    expect(res.status).toBe(403);
    expect(queryMock).toHaveBeenCalledTimes(1); // only the is_system check, no UPDATE
  });

  it("updates patterns/exclude as JSON and leaves unspecified fields as COALESCE(null, ...)", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ is_system: false }] })
      .mockResolvedValueOnce({ rows: [{ id: "f1" }] });

    await callPut({ patterns: ["ram installata"], showAsChip: true });

    const [, params] = queryMock.mock.calls[1];
    expect(params[7]).toBe(JSON.stringify(["ram installata"])); // patterns
    expect(params[8]).toBeNull(); // exclude not provided -> COALESCE keeps existing
    expect(params[9]).toBe(true); // show_as_chip
    expect(params[5]).toBeNull(); // valueMode not provided -> COALESCE keeps existing
  });

  it("rejects an invalid valueMode value (falls through to COALESCE, not overwritten)", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ is_system: false }] })
      .mockResolvedValueOnce({ rows: [{ id: "f1" }] });

    await callPut({ valueMode: "bogus" });

    const [, params] = queryMock.mock.calls[1];
    expect(params[5]).toBeNull();
  });
});
