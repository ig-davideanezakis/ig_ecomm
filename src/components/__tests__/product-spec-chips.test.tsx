import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductSpecChips } from "@/components/shop/product-spec-chips";
import { SpecChipIcon } from "@/components/shop/spec-chip-icon";
import type { SpecChipValue } from "@/lib/spec-chips";

const chips: SpecChipValue[] = [
  { id: "cpu", label: "CPU", icon: "cpu", value: "Intel Core Ultra 9" },
  { id: "ram", label: "RAM", icon: "memory-stick", value: "32 GB" },
  { id: "storage", label: "Archiviazione", icon: "hard-drive", value: "1 TB" },
];

describe("ProductSpecChips (detail variant)", () => {
  it("renders label and value for every chip with a list role", () => {
    render(<ProductSpecChips chips={chips} />);
    const list = screen.getByRole("list", { name: "Caratteristiche principali" });
    expect(list).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("CPU")).toBeInTheDocument();
    expect(screen.getByText("Intel Core Ultra 9")).toBeInTheDocument();
    expect(screen.getByText("RAM")).toBeInTheDocument();
    expect(screen.getByText("32 GB")).toBeInTheDocument();
  });

  it("renders one icon per chip", () => {
    const { container } = render(<ProductSpecChips chips={chips} />);
    expect(container.querySelectorAll("svg")).toHaveLength(3);
  });

  it("renders nothing when there are no chips", () => {
    const { container } = render(<ProductSpecChips chips={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("ProductSpecChips (card variant)", () => {
  it("shows values compactly and keeps the label for screen readers and tooltip", () => {
    render(<ProductSpecChips chips={chips} variant="card" />);
    expect(screen.getByText("Intel Core Ultra 9")).toBeInTheDocument();
    expect(screen.getByText("32 GB")).toBeInTheDocument();
    // sr-only labels give screen-reader context
    expect(screen.getAllByText("CPU:")[0]).toBeInTheDocument();
    // full context is available on hover
    expect(screen.getByTitle("RAM: 32 GB")).toBeInTheDocument();
  });

  it("renders nothing when empty", () => {
    const { container } = render(<ProductSpecChips chips={[]} variant="card" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("SpecChipIcon", () => {
  it("renders the icon matching the registry key", () => {
    const { container } = render(<SpecChipIcon name="cpu" />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("falls back to the Tag icon for unknown keys (no crash)", () => {
    const { container } = render(<SpecChipIcon name="does-not-exist" />);
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
