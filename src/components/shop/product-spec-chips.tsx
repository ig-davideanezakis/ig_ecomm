import type { SpecChipValue } from "@/lib/spec-chips";
import { SpecChipIcon } from "./spec-chip-icon";

/**
 * Renders extracted spec chips as icon+value pills.
 *
 * Two variants:
 *   - "detail": icon + label + value (product page, above the price);
 *   - "card":   compact icon + value row (product cards in list/search);
 *               the full "label: value" is available on hover via title,
 *               and to screen readers via an sr-only span.
 */

interface ProductSpecChipsProps {
  chips: SpecChipValue[];
  variant?: "detail" | "card";
  className?: string;
}

export function ProductSpecChips({
  chips,
  variant = "detail",
  className = "",
}: ProductSpecChipsProps) {
  if (!chips.length) return null;

  if (variant === "card") {
    return (
      <ul
        aria-label="Caratteristiche principali"
        className={`flex flex-wrap gap-x-3 gap-y-1 ${className}`}
      >
        {chips.map((chip) => (
          <li
            key={chip.id}
            title={`${chip.label}: ${chip.value}`}
            className="inline-flex max-w-full items-center gap-1.5 text-[11px] leading-tight text-muted-foreground"
          >
            <SpecChipIcon name={chip.icon} className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="sr-only">{chip.label}: </span>
            <span className="truncate font-medium text-foreground/90">{chip.value}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul aria-label="Caratteristiche principali" className={`flex flex-wrap gap-2 ${className}`}>
      {chips.map((chip) => (
        <li
          key={chip.id}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-sm"
        >
          <SpecChipIcon name={chip.icon} className="h-4 w-4 shrink-0 text-primary" />
          <span className="text-muted-foreground">{chip.label}</span>
          <span className="font-medium text-foreground">{chip.value}</span>
        </li>
      ))}
    </ul>
  );
}
