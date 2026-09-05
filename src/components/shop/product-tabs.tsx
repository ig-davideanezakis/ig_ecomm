"use client";

import { useMemo, useRef, useState } from "react";
import SpecificationsView from "@/components/shop/specifications-view";
import { buildProductTabs, type ProductInfoTabs, type ProductTabDef } from "@/lib/product-tabs";

/**
 * Product detail tabbed layout: Panoramica / Descrizione / Specifiche tecniche
 * (only when the related field is filled) + Come acquista / Garanzia / Recesso
 * (store-wide, editable in Admin → Impostazioni).
 *
 * Accessibility: proper role=tablist/tab/tabpanel wiring with roving tabindex
 * and Arrow/Home/End keyboard navigation. Panels stay in the DOM (hidden with
 * the `hidden` attribute) so the content is available to search engines and
 * assistive tech that navigates the full page.
 */

interface ProductTabsProps {
  productTitle: string;
  overviewHtml?: string | null;
  contentHtml?: string | null;
  specificationsJson?: string | null;
  infoTabs: ProductInfoTabs;
}

const TAB_IDS_PANEL_CONTENT: Record<string, keyof ProductInfoTabs> = {
  "come-acquista": "howToBuy",
  garanzia: "warranty",
  recesso: "withdrawal",
};

export function ProductTabs({
  productTitle,
  overviewHtml,
  contentHtml,
  specificationsJson,
  infoTabs,
}: ProductTabsProps) {
  const tabs: ProductTabDef[] = useMemo(
    () => buildProductTabs({ overviewHtml, contentHtml, specificationsJson }),
    [overviewHtml, contentHtml, specificationsJson],
  );

  const [activeId, setActiveId] = useState<string>(tabs[0]?.id ?? "come-acquista");
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  if (tabs.length === 0) return null;

  const select = (id: string) => {
    setActiveId(id);
    tabRefs.current[id]?.focus();
  };

  const onTabListKeyDown = (e: React.KeyboardEvent) => {
    const index = tabs.findIndex((t) => t.id === activeId);
    if (e.key === "ArrowRight") {
      e.preventDefault();
      select(tabs[(index + 1) % tabs.length].id);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      select(tabs[(index - 1 + tabs.length) % tabs.length].id);
    } else if (e.key === "Home") {
      e.preventDefault();
      select(tabs[0].id);
    } else if (e.key === "End") {
      e.preventDefault();
      select(tabs[tabs.length - 1].id);
    }
  };

  const renderRich = (html: string) => (
    <div
      className="product-rich-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );

  return (
    <div className="mt-16">
      {/* Tab list */}
      <div
        role="tablist"
        aria-label="Contenuti del prodotto"
        onKeyDown={onTabListKeyDown}
        className="flex flex-wrap gap-1 border-b border-border"
      >
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={active}
              aria-controls={`panel-${tab.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setActiveId(tab.id)}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Panels — all in the DOM, only the active one is visible */}
      <div className="mx-auto mt-8 max-w-3xl">
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          return (
            <div
              key={tab.id}
              role="tabpanel"
              id={`panel-${tab.id}`}
              aria-labelledby={`tab-${tab.id}`}
              hidden={!active}
              className="tab-panel"
            >
              {tab.id === "specifiche" && specificationsJson ? (
                <SpecificationsView value={specificationsJson} />
              ) : tab.id === "panoramica" && overviewHtml ? (
                renderRich(overviewHtml)
              ) : tab.id === "descrizione" && contentHtml ? (
                renderRich(contentHtml)
              ) : (
                renderRich(infoTabs[TAB_IDS_PANEL_CONTENT[tab.id]])
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
