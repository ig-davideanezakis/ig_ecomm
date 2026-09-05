import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ProductTabs } from "@/components/shop/product-tabs";
import { DEFAULT_INFO_TABS } from "@/lib/product-tabs";

const SPECS = JSON.stringify([
  { group: "Display", rows: [{ label: "Risoluzione", value: "3440 x 1440" }] },
]);

const OVERVIEW = "<h2>Punti di forza</h2><p>Marketing content</p>";
const CONTENT = "<p>Descrizione dettagliata del prodotto</p>";

const renderTabs = () =>
  render(
    <ProductTabs
      productTitle="Monitor Test"
      overviewHtml={OVERVIEW}
      contentHtml={CONTENT}
      specificationsJson={SPECS}
      infoTabs={DEFAULT_INFO_TABS}
    />,
  );

const tab = (name: string) => screen.getByRole("tab", { name });
const panel = (id: string) => screen.getByRole("tabpanel", { name: id });

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("ProductTabs", () => {
  it("renders all six tabs with the correct default (Panoramica first)", () => {
    renderTabs();
    for (const label of [
      "Panoramica",
      "Descrizione",
      "Specifiche tecniche",
      "Come acquista",
      "Garanzia",
      "Recesso",
    ]) {
      expect(tab(label)).toBeInTheDocument();
    }
    expect(tab("Panoramica")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Marketing content")).toBeVisible();
  });

  it("keeps inactive panels in the DOM but hidden", () => {
    renderTabs();
    // Hidden panels are excluded from the a11y tree by the `hidden` attribute,
    // but stay in the DOM for SEO/full-page navigation.
    expect(document.getElementById("panel-descrizione")).toHaveAttribute("hidden");
    expect(document.getElementById("panel-specifiche")).toHaveAttribute("hidden");
    expect(document.getElementById("panel-panoramica")).not.toHaveAttribute("hidden");
  });

  it("switches panels on tab click", () => {
    renderTabs();
    fireEvent.click(tab("Specifiche tecniche"));
    expect(tab("Specifiche tecniche")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Risoluzione")).toBeVisible();
    expect(panel("Specifiche tecniche")).not.toHaveAttribute("hidden");

    fireEvent.click(tab("Garanzia"));
    expect(screen.getByText(/24 mesi/)).toBeVisible();

    fireEvent.click(tab("Descrizione"));
    expect(screen.getByText("Descrizione dettagliata del prodotto")).toBeVisible();
  });

  it("navigates with arrow keys (roving tabindex)", () => {
    renderTabs();
    fireEvent.keyDown(screen.getByRole("tablist"), { key: "ArrowRight" });
    expect(tab("Descrizione")).toHaveAttribute("aria-selected", "true");
    expect(document.activeElement).toBe(tab("Descrizione"));

    fireEvent.keyDown(screen.getByRole("tablist"), { key: "End" });
    expect(tab("Recesso")).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(screen.getByRole("tablist"), { key: "ArrowRight" });
    // wraps back to the first tab
    expect(tab("Panoramica")).toHaveAttribute("aria-selected", "true");
  });

  it("omits empty product tabs but keeps the info tabs", () => {
    render(
      <ProductTabs
        productTitle="Solo info"
        overviewHtml=""
        contentHtml=""
        specificationsJson=""
        infoTabs={DEFAULT_INFO_TABS}
      />,
    );
    expect(screen.queryByRole("tab", { name: "Panoramica" })).not.toBeInTheDocument();
    expect(tab("Come acquista")).toBeInTheDocument();
    expect(tab("Garanzia")).toBeInTheDocument();
    expect(tab("Recesso")).toBeInTheDocument();
    // first info tab is the default when no product content exists
    expect(tab("Come acquista")).toHaveAttribute("aria-selected", "true");
  });
});
