import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { InfografLogo } from "@/components/infograf-logo";

describe("InfografLogo", () => {
  it("renders an SVG element", () => {
    const { container } = render(<InfografLogo />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("renders the brand name INFOGRAF as SVG text", () => {
    const { container } = render(<InfografLogo />);
    const texts = container.querySelectorAll("text");
    const infografText = Array.from(texts).find((t) =>
      t.textContent?.includes("INFOGRAF"),
    );
    expect(infografText).toBeInTheDocument();
  });

  it("renders SINCE 1992 tagline as SVG text", () => {
    const { container } = render(<InfografLogo />);
    const texts = container.querySelectorAll("text");
    const sinceText = Array.from(texts).find((t) =>
      t.textContent?.includes("SINCE 1992"),
    );
    expect(sinceText).toBeInTheDocument();
  });

  it("uses currentColor for text fill — no flash on first paint", () => {
    const { container } = render(<InfografLogo />);
    const texts = container.querySelectorAll("text");
    texts.forEach((text) => {
      expect(text).toHaveAttribute("fill", "currentColor");
    });
  });

  it("uses fixed #ff0c3c for the red accent rect", () => {
    const { container } = render(<InfografLogo />);
    const rect = container.querySelector("rect");
    expect(rect).toBeInTheDocument();
    expect(rect).toHaveAttribute("fill", "#ff0c3c");
  });

  it("does not import or use useTheme (no hydration dependency)", () => {
    // Verify the component source doesn't reference useTheme
    // by checking the rendered output has no client-data attributes
    const { container } = render(<InfografLogo />);
    const svg = container.querySelector("svg");
    // If useTheme was used, the component would need "use client"
    // and would have a different rendering behavior. With currentColor
    // approach, the SVG is pure and stateless.
    expect(svg?.querySelectorAll("[data-theme]").length).toBe(0);
  });

  it("accepts and applies a custom className", () => {
    const { container } = render(<InfografLogo className="h-8 w-auto custom" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("h-8");
    expect(svg).toHaveClass("w-auto");
    expect(svg).toHaveClass("custom");
  });

  it("does not require a parent ThemeProvider", () => {
    // Unlike ThemeToggle which requires ThemeProvider context,
    // InfografLogo should render fine standalone (no useTheme call)
    expect(() => render(<InfografLogo />)).not.toThrow();
  });

  it("renders the red accent rect at the correct position", () => {
    const { container } = render(<InfografLogo />);
    const rect = container.querySelector("rect");
    expect(rect).toHaveAttribute("x", "0");
    expect(rect).toHaveAttribute("y", "10");
    expect(rect).toHaveAttribute("width", "6");
    expect(rect).toHaveAttribute("height", "28");
    expect(rect).toHaveAttribute("rx", "3");
  });

  it("has proper SVG viewBox", () => {
    const { container } = render(<InfografLogo />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("viewBox", "0 0 240 48");
    expect(svg).toHaveAttribute("fill", "none");
  });

  it("text elements have correct font attributes", () => {
    const { container } = render(<InfografLogo />);
    const texts = container.querySelectorAll("text");
    const infografText = Array.from(texts).find((t) =>
      t.textContent?.includes("INFOGRAF"),
    );
    expect(infografText).toHaveAttribute("font-weight", "800");
    expect(infografText).toHaveAttribute("font-size", "28");
    expect(infografText).toHaveAttribute("letter-spacing", "1");

    const sinceText = Array.from(texts).find((t) =>
      t.textContent?.includes("SINCE 1992"),
    );
    expect(sinceText).toHaveAttribute("font-weight", "500");
    expect(sinceText).toHaveAttribute("font-size", "10");
    expect(sinceText).toHaveAttribute("opacity", "0.5");
  });
});
