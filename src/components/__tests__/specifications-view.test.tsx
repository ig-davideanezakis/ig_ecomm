import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SpecificationsView, {
  parseSpecifications,
  type SpecGroupData,
} from "@/components/shop/specifications-view";

describe("parseSpecifications", () => {
  it("returns null for empty values", () => {
    expect(parseSpecifications(null)).toBeNull();
    expect(parseSpecifications("")).toBeNull();
    expect(parseSpecifications("   ")).toBeNull();
  });

  it("parses structured group JSON", () => {
    const raw = JSON.stringify([
      { group: "Display", rows: [{ label: "Risoluzione", value: "3440x1440" }] },
    ]);
    const parsed = parseSpecifications(raw);
    expect(parsed?.kind).toBe("groups");
    if (parsed?.kind === "groups") {
      expect(parsed.groups[0].group).toBe("Display");
    }
  });

  it("treats non-JSON as legacy HTML", () => {
    const parsed = parseSpecifications("<table><tr><td>CPU</td></tr></table>");
    expect(parsed?.kind).toBe("html");
  });

  it("rejects malformed JSON arrays (falls back to HTML)", () => {
    const parsed = parseSpecifications('[{"group":"Display","rows":"nope"}]');
    expect(parsed?.kind).toBe("html");
  });
});

describe("SpecificationsView", () => {
  const groups: SpecGroupData[] = [
    { group: "Display", rows: [{ label: "Risoluzione", value: "3440x1440" }] },
    {
      group: "Processore",
      rows: [
        { label: "Famiglia", value: "Intel Core i7" },
        { label: "Modello", value: "14700HX" },
      ],
    },
  ];

  it("renders group headings and row labels/values", () => {
    render(<SpecificationsView value={JSON.stringify(groups)} />);
    expect(screen.getByText("Display")).toBeInTheDocument();
    expect(screen.getByText("Processore")).toBeInTheDocument();
    expect(screen.getByText("Risoluzione")).toBeInTheDocument();
    expect(screen.getByText("3440x1440")).toBeInTheDocument();
    expect(screen.getByText("Intel Core i7")).toBeInTheDocument();
  });

  it("renders legacy HTML as-is", () => {
    render(<SpecificationsView value="<table><tbody><tr><td>CPU</td><td>i5</td></tr></tbody></table>" />);
    expect(screen.getByText("CPU")).toBeInTheDocument();
    expect(screen.getByText("i5")).toBeInTheDocument();
  });

  it("renders raw values as text (no HTML injection)", () => {
    const malicious = JSON.stringify([
      { group: "", rows: [{ label: "CPU", value: '<img src=x onerror="window.__xss=1">' }] },
    ]);
    render(<SpecificationsView value={malicious} />);
    // React escapes the value: the img tag is text, not a DOM node
    expect(document.querySelector("img[src=x]")).toBeNull();
    expect(screen.getByText('<img src=x onerror="window.__xss=1">')).toBeInTheDocument();
  });

  it("renders nothing when the value is empty", () => {
    const { container } = render(<SpecificationsView value={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
