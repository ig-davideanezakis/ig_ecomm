import { describe, expect, it } from "vitest";
import { buildProductTabs, DEFAULT_INFO_TABS } from "@/lib/product-tabs";

describe("buildProductTabs", () => {
  it("shows product tabs only when the related field is filled, info tabs always", () => {
    const tabs = buildProductTabs({ overviewHtml: "", contentHtml: "", specificationsJson: "" });
    expect(tabs.map((t) => t.id)).toEqual(["come-acquista", "garanzia", "recesso"]);
  });

  it("orders: panoramica → descrizione → specifiche → info tabs", () => {
    const tabs = buildProductTabs({
      overviewHtml: "<p>marketing</p>",
      contentHtml: "<p>desc</p>",
      specificationsJson: "[]",
    });
    expect(tabs.map((t) => t.id)).toEqual([
      "panoramica",
      "descrizione",
      "specifiche",
      "come-acquista",
      "garanzia",
      "recesso",
    ]);
  });

  it("labels match the requested tabs", () => {
    const labels = buildProductTabs({
      overviewHtml: "<p>x</p>",
      contentHtml: "<p>x</p>",
      specificationsJson: "[{}]",
    }).map((t) => t.label);
    expect(labels).toEqual([
      "Panoramica",
      "Descrizione",
      "Specifiche tecniche",
      "Come acquista",
      "Garanzia",
      "Recesso",
    ]);
  });
});

describe("DEFAULT_INFO_TABS", () => {
  it("provides non-empty defaults for all three store tabs", () => {
    expect(DEFAULT_INFO_TABS.howToBuy).toContain("Spedizione");
    expect(DEFAULT_INFO_TABS.warranty).toContain("24 mesi");
    expect(DEFAULT_INFO_TABS.withdrawal).toContain("14 giorni");
  });
});
