"use client";

import { useState } from "react";
import {
  DEFAULT_SPEC_CHIPS,
  parseSpecChipsConfig,
  type SpecChipConfig,
} from "@/lib/spec-chips";
import { SPEC_ICON_OPTIONS, SpecChipIcon } from "@/components/shop/spec-chip-icon";

/**
 * Admin editor for the product spec chips configuration.
 *
 * The parent (Admin → Impostazioni) keeps the persisted JSON in its settings
 * map; this editor shows editable rows (icon, label, Icecat label patterns,
 * optional excludes) and serializes any change back via onChange(JSON).
 *
 * Persisted format: [{ id, label, icon, patterns[], exclude[]? }].
 * - Empty value (never configured) → rows start from DEFAULT_SPEC_CHIPS so
 *   what the shop shows today is visible/editable right away.
 * - Removing every row and saving disables chips entirely.
 */

interface DraftChip {
  id: string;
  label: string;
  icon: string;
  patternsText: string;
  excludeText: string;
}

function nextId(): string {
  return `chip-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function splitTokens(text: string): string[] {
  return text
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function configToDrafts(config: SpecChipConfig[]): DraftChip[] {
  return config.map((c) => ({
    id: c.id,
    label: c.label,
    icon: c.icon,
    patternsText: c.patterns.join(", "),
    excludeText: (c.exclude ?? []).join(", "),
  }));
}

function draftsToJson(drafts: DraftChip[]): string {
  const config = drafts
    .filter((d) => d.label.trim() && splitTokens(d.patternsText).length > 0)
    .map((d) => ({
      id: d.id,
      label: d.label.trim(),
      icon: d.icon,
      patterns: splitTokens(d.patternsText),
      ...(splitTokens(d.excludeText).length ? { exclude: splitTokens(d.excludeText) } : {}),
    }));
  return JSON.stringify(config);
}

export function SpecChipsEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (json: string) => void;
}) {
  const [drafts, setDrafts] = useState<DraftChip[]>(() => {
    const parsed = parseSpecChipsConfig(value);
    return configToDrafts(parsed ?? DEFAULT_SPEC_CHIPS);
  });

  // Sync when the persisted value arrives/changes externally (initial fetch,
  // reset button). Render-phase adjustment (React "adjusting state when props
  // change" pattern) — no effect, so no cascading renders. Echoes of our own
  // edits re-parse to identical rows, which is a no-op visually.
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    const incoming = parseSpecChipsConfig(value);
    if (incoming) setDrafts(configToDrafts(incoming));
  }

  const commit = (next: DraftChip[]) => {
    setDrafts(next);
    onChange(draftsToJson(next));
  };

  const update = (id: string, patch: Partial<DraftChip>) => {
    commit(drafts.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= drafts.length) return;
    const next = [...drafts];
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
  };

  const remove = (id: string) => commit(drafts.filter((d) => d.id !== id));

  const addChip = () => {
    const next = [...drafts, { id: nextId(), label: "", icon: "tag", patternsText: "", excludeText: "" }];
    commit(next);
  };

  const loadDefaults = () => commit(configToDrafts(DEFAULT_SPEC_CHIPS));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Le caratteristiche evidenziate come chip nelle card prodotto e nella scheda
          prodotto. Ordine = priorità di visualizzazione. Le etichette Icecat si
          abbinano in modo flessibile (es. &quot;ram installata&quot; trova anche
          &quot;RAM installata (max)&quot;).
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadDefaults}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
          >
            Carica chip predefinite
          </button>
          <button
            type="button"
            onClick={addChip}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            + Aggiungi caratteristica
          </button>
        </div>
      </div>

      {drafts.length === 0 && (
        <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          Nessuna chip configurata — le caratteristiche non verranno mostrate. Aggiungine una o
          ripristina le predefinite.
        </p>
      )}

      <div className="space-y-2">
        {drafts.map((chip, index) => (
          <div
            key={chip.id}
            className="flex flex-col gap-3 rounded-md border border-border bg-muted/20 p-3 md:flex-row md:items-center"
          >
            {/* Icon picker with live preview */}
            <div className="flex items-center gap-2">
              <SpecChipIcon name={chip.icon} className="h-5 w-5 shrink-0 text-primary" />
              <label className="sr-only" htmlFor={`chip-icon-${chip.id}`}>Icona</label>
              <select
                id={`chip-icon-${chip.id}`}
                value={chip.icon}
                onChange={(e) => update(chip.id, { icon: e.target.value })}
                className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
              >
                {SPEC_ICON_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Label */}
            <div className="flex-1">
              <label className="mb-0.5 block text-xs font-medium" htmlFor={`chip-label-${chip.id}`}>
                Etichetta mostrata
              </label>
              <input
                id={`chip-label-${chip.id}`}
                type="text"
                value={chip.label}
                onChange={(e) => update(chip.id, { label: e.target.value })}
                placeholder="es. CPU, RAM, Archiviazione"
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              />
            </div>

            {/* Patterns */}
            <div className="min-w-0 flex-[1.6]">
              <label className="mb-0.5 block text-xs font-medium" htmlFor={`chip-patterns-${chip.id}`}>
                Etichette Icecat da abbinare (virgole)
              </label>
              <input
                id={`chip-patterns-${chip.id}`}
                type="text"
                value={chip.patternsText}
                onChange={(e) => update(chip.id, { patternsText: e.target.value })}
                placeholder="es. famiglia processore, modello del processore"
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              />
            </div>

            {/* Excludes */}
            <div className="min-w-0 flex-1">
              <label className="mb-0.5 block text-xs font-medium" htmlFor={`chip-exclude-${chip.id}`}>
                Da escludere (opzionale)
              </label>
              <input
                id={`chip-exclude-${chip.id}`}
                type="text"
                value={chip.excludeText}
                onChange={(e) => update(chip.id, { excludeText: e.target.value })}
                placeholder="es. frequenza, produttore"
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              />
            </div>

            {/* Order / delete */}
            <div className="flex items-center gap-1 md:flex-col md:items-end">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Sposta ${chip.label || "chip"} in alto`}
                  className="rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === drafts.length - 1}
                  aria-label={`Sposta ${chip.label || "chip"} in basso`}
                  className="rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-30"
                >
                  ↓
                </button>
              </div>
              <button
                type="button"
                onClick={() => remove(chip.id)}
                aria-label={`Rimuovi ${chip.label || "chip"}`}
                className="rounded border border-border px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
              >
                Elimina
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Le voci senza etichetta o senza pattern vengono ignorate al salvataggio. Rimuovendo tutte
        le righe le chip vengono disattivate.
      </p>
    </div>
  );
}
