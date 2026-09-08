import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductFilterValuesEditor } from "@/components/admin/product-filter-values-editor";

const filtersResponse = [
  {
    id: "f-cpu", name: "CPU", value_mode: "auto", show_as_chip: true, use_as_filter: true,
    options: [],
  },
  {
    id: "f-color", name: "Colore", value_mode: "manual", show_as_chip: false, use_as_filter: true,
    options: [{ id: "o1", value: "nero", label: "Nero" }, { id: "o2", value: "bianco", label: "Bianco" }],
  },
];

function jsonResponse(body: unknown) {
  return Promise.resolve({ json: () => Promise.resolve(body) } as Response);
}

function mockFetchSequence(productFilterValues: unknown[]) {
  return vi.fn((url: string) => {
    if (url === "/api/admin/filters") return jsonResponse(filtersResponse);
    if (url.includes("/filter-values")) return jsonResponse({ success: true });
    return jsonResponse({ filterValues: productFilterValues });
  });
}

describe("ProductFilterValuesEditor", () => {
  beforeEach(() => {
    global.fetch = mockFetchSequence([
      { filterId: "f-cpu", value: "Intel Core i7", isOverride: false },
    ]) as unknown as typeof fetch;
  });

  it("shows each relevant filter with its current value and mode", async () => {
    render(<ProductFilterValuesEditor productId="prod1" />);

    await waitFor(() => expect(screen.getByText("CPU")).toBeInTheDocument());
    expect(screen.getByDisplayValue("Intel Core i7")).toBeInTheDocument();
    expect(screen.getByText("Automatico da specifiche")).toBeInTheDocument();
    expect(screen.getByText("Manuale")).toBeInTheDocument();
  });

  it("shows a manual filter with curated options as a select, with a corrected badge when overridden", async () => {
    global.fetch = mockFetchSequence([
      { filterId: "f-cpu", value: "Intel Core i9", isOverride: true },
    ]) as unknown as typeof fetch;

    render(<ProductFilterValuesEditor productId="prod1" />);
    await waitFor(() => expect(screen.getByText("corretto a mano", { exact: false })).toBeInTheDocument());
    expect(screen.getByLabelText("Valore per Colore").tagName).toBe("SELECT");
  });

  it("disables Salva until the draft actually changes, then PUTs the new value", async () => {
    render(<ProductFilterValuesEditor productId="prod1" />);
    await waitFor(() => expect(screen.getByDisplayValue("Intel Core i7")).toBeInTheDocument());

    const input = screen.getByLabelText("Valore per CPU");
    const saveButtons = screen.getAllByRole("button", { name: "Salva" });
    expect(saveButtons[0]).toBeDisabled();

    await userEvent.clear(input);
    await userEvent.type(input, "Intel Core i9");
    expect(saveButtons[0]).not.toBeDisabled();

    await userEvent.click(saveButtons[0]);

    await waitFor(() => {
      const putCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
        (c) => typeof c[0] === "string" && c[0].includes("/filter-values"),
      );
      expect(putCall).toBeDefined();
      expect(JSON.parse(putCall![1].body)).toEqual({ filterId: "f-cpu", value: "Intel Core i9" });
    });
  });

  it("only shows a Ricalcola button for auto-mode filters", async () => {
    render(<ProductFilterValuesEditor productId="prod1" />);
    await waitFor(() => expect(screen.getByText("CPU")).toBeInTheDocument());
    expect(screen.getAllByRole("button", { name: "Ricalcola" })).toHaveLength(1);
  });
});
