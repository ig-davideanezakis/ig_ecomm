import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeToggle } from "@/components/theme-toggle";

describe("ThemeToggle", () => {
  it("renders a single toggle button", () => {
    render(<ThemeToggle />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
  });

  it("has accessible aria-label for theme toggle", () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-label");
  });

  it("renders sun and moon icons", () => {
    render(<ThemeToggle />);
    const svgs = document.querySelectorAll("svg.lucide-sun, svg.lucide-moon");
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });
});
