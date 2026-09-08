import { describe, it, expect, vi, beforeEach } from "vitest";

const { authorizeMock, queryMock } = vi.hoisted(() => ({
  authorizeMock: vi.fn(),
  queryMock: vi.fn(),
}));

vi.mock("@/lib/auth-helpers", () => ({ authorize: authorizeMock }));
vi.mock("@/lib/db", () => ({ pool: { query: queryMock } }));

import { POST } from "./route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/filters", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;
}

describe("POST /api/admin/filters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authorizeMock.mockResolvedValue({ id: "admin1", role: "ADMIN", email: "a@a.it" });
    queryMock.mockResolvedValue({ rows: [{ id: "f1" }] });
  });

  it("defaults to manual value mode and use_as_filter=true when unspecified", async () => {
    await POST(makeRequest({ name: "Colore", slug: "colore" }));
    const [, params] = queryMock.mock.calls[0];
    expect(params[5]).toBe("manual"); // value_mode
    expect(params[10]).toBe(true); // use_as_filter
    expect(params[9]).toBe(false); // show_as_chip
  });

  it("serializes patterns/exclude as JSON and accepts auto mode + showAsChip", async () => {
    await POST(makeRequest({
      name: "CPU", slug: "cpu", valueMode: "auto", icon: "cpu",
      patterns: ["famiglia processore"], exclude: ["frequenza"],
      showAsChip: true, useAsFilter: true,
    }));
    const [, params] = queryMock.mock.calls[0];
    expect(params[5]).toBe("auto");
    expect(params[6]).toBe("cpu");
    expect(params[7]).toBe(JSON.stringify(["famiglia processore"]));
    expect(params[8]).toBe(JSON.stringify(["frequenza"]));
    expect(params[9]).toBe(true);
  });

  it("rejects requests missing name/slug", async () => {
    const res = await POST(makeRequest({ name: "" }));
    expect(res.status).toBe(400);
    expect(queryMock).not.toHaveBeenCalled();
  });
});
