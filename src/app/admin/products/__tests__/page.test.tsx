import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { replaceMock, searchParamsMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  searchParamsMock: new URLSearchParams("search=laptop&page=2&category=notebook"),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
  usePathname: () => "/admin/products",
  useSearchParams: () => searchParamsMock,
}));

import AdminProductsPage from "../page";

function jsonResponse(body: unknown) {
  return Promise.resolve({ json: () => Promise.resolve(body) } as Response);
}

const emptyList = {
  products: [],
  filters: { categories: [], brands: [] },
  pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
};

describe("AdminProductsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(() => jsonResponse(emptyList)) as unknown as typeof fetch;
  });

  it("initializes search/page/category from the current URL instead of resetting to defaults", async () => {
    render(<AdminProductsPage />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const requestedUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(requestedUrl).toContain("search=laptop");
    expect(requestedUrl).toContain("page=2");
    expect(requestedUrl).toContain("category=notebook");
  });

  it("keeps the list's filters/page mirrored into the URL via router.replace", async () => {
    render(<AdminProductsPage />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalled());
    const replacedUrl = replaceMock.mock.calls[0][0] as string;
    expect(replacedUrl).toContain("/admin/products?");
    expect(replacedUrl).toContain("search=laptop");
    expect(replacedUrl).toContain("page=2");
  });

  it("resets to page 1 when the search term changes", async () => {
    render(<AdminProductsPage />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    const input = screen.getByPlaceholderText(/Cerca per titolo, SKU, EAN o codice/i);
    await userEvent.clear(input);
    await userEvent.type(input, "mouse");

    await waitFor(() => {
      const lastUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0] as string;
      expect(lastUrl).toContain("search=mouse");
      expect(lastUrl).toContain("page=1");
    });
  });
});
