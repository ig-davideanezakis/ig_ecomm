import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeToggle } from "@/components/theme-toggle";

describe("ThemeToggle", () => {
  it("renders a single toggle button (no nested buttons)", () => {
    render(<ThemeToggle />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
  });

  it("has 'Toggle theme' in the sr-only span", () => {
    render(<ThemeToggle />);
    expect(screen.getByText("Toggle theme")).toBeInTheDocument();
  });

  it("renders sun and moon icons", () => {
    render(<ThemeToggle />);
    const svgs = document.querySelectorAll("svg.lucide-sun, svg.lucide-moon");
    expect(svgs.length).toBe(2);
  });
});
