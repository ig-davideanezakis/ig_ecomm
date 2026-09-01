"use client";

import { useMemo, useState } from "react";
import type { IcecatProductData } from "@/lib/icecat";
import {
  buildIcecatSections,
  type IcecatFormSnapshot,
  type IcecatSectionId,
} from "@/lib/icecat-form";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: IcecatProductData | null;
  snapshot: IcecatFormSnapshot;
  brands: { id: string; name: string; slug: string }[];
  categories: { id: string; name: string; slug: string }[];
  onApply: (selected: Set<IcecatSectionId>) => void;
}

export default function IcecatDialog({
  open,
  onOpenChange,
  data,
  snapshot,
  brands,
  categories,
  onApply,
}: Props) {
  const sections = useMemo(
    () => (data ? buildIcecatSections(data, snapshot, { brands, categories }) : []),
    [data, snapshot, brands, categories],
  );

  const [selected, setSelected] = useState<Set<IcecatSectionId>>(new Set());

  // Reset the selection whenever a new lookup result arrives.
  // Render-phase state adjustment (React docs: "Storing information from
  // previous renders") — avoids a setState-in-effect lint violation and
  // re-renders only when `data` actually changes.
  const [lastData, setLastData] = useState<IcecatProductData | null>(null);
  if (data && data !== lastData) {
    setLastData(data);
    setSelected(
      new Set(sections.filter((s) => s.defaultSelected).map((s) => s.id)),
    );
  }

  if (!data) return null;

  const toggle = (id: IcecatSectionId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const apply = () => {
    onApply(selected);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Dati trovati su Icecat</DialogTitle>
        <DialogDescription>
          Scegli quali sezioni importare nel prodotto. I campi già compilati non
          vengono sovrascritti se lasciati deselezionati.
        </DialogDescription>

        <div className="space-y-2" role="group" aria-label="Sezioni da importare">
          {sections.map((section) => (
            <label
              key={section.id}
              className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/40 transition-colors"
            >
              <input
                type="checkbox"
                id={`icecat-section-${section.id}`}
                checked={selected.has(section.id)}
                onChange={() => toggle(section.id)}
                className="mt-0.5 rounded border-border"
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{section.label}</span>
                  {section.conflict && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-600">
                      già compilato — verrà sovrascritto
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {section.preview}
                </span>
                {section.id === "images" && selected.has("images") && (
                  <span className="mt-2 flex flex-wrap gap-1.5">
                    {data.images.slice(0, 6).map((img, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={img.url}
                        alt={img.alt || `Anteprima Icecat ${i + 1}`}
                        className="h-12 w-12 rounded-md border object-cover"
                      />
                    ))}
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <DialogClose
            type="button"
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted/60 transition-colors"
          >
            Annulla
          </DialogClose>
          <button
            type="button"
            onClick={apply}
            disabled={selected.size === 0}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Importa selezionate ({selected.size})
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
