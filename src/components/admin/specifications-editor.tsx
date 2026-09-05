"use client";

import { useState } from "react";

/**
 * Visual + raw-JSON editor for the product "specifiche tecniche" field.
 *
 * The field is stored as grouped JSON:
 *   [{ "group": "Display", "rows": [{ "label": "Risoluzione", "value": "3440 x 1440" }] }]
 * This editor lets you see the groups expanded — edit group names and
 * label/value rows visually — or switch to the raw JSON (larger textarea) for
 * advanced edits. Both views stay in sync through the controlled `value`.
 */

export interface SpecGroupRow {
  label: string;
  value: string;
}

export interface SpecGroupDraft {
  group: string;
  rows: SpecGroupRow[];
}

/** Parse a grouped-JSON string into editable groups (null when not JSON). */
export function parseSpecGroups(raw: string): SpecGroupDraft[] | null {
  if (!raw || !raw.trim()) return [];
  const trimmed = raw.trim();
  if (!trimmed.startsWith("[")) return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (
      Array.isArray(parsed) &&
      parsed.every(
        (g) =>
          g &&
          typeof (g as SpecGroupDraft).group === "string" &&
          Array.isArray((g as SpecGroupDraft).rows) &&
          (g as SpecGroupDraft).rows.every(
            (r) => r && typeof (r as SpecGroupRow).label === "string" && typeof (r as SpecGroupRow).value === "string",
          ),
      )
    ) {
      return (parsed as SpecGroupDraft[]).map((g) => ({
        group: g.group ?? "",
        rows: g.rows.map((r) => ({ label: r.label ?? "", value: r.value ?? "" })),
      }));
    }
  } catch {
    // not valid JSON
  }
  return null;
}

/** Serialize groups back to the stored JSON (dropping fully-empty rows/groups). */
export function serializeSpecGroups(groups: SpecGroupDraft[]): string {
  const clean = groups
    .map((g) => ({
      group: g.group.trim(),
      rows: g.rows.filter((r) => r.label.trim() || r.value.trim()).map((r) => ({
        label: r.label.trim(),
        value: r.value.trim(),
      })),
    }))
    .filter((g) => g.group || g.rows.length > 0);

  // Keep ungrouped rows as a single unnamed group when the user typed rows
  // without a group name — same behaviour as the shop renderer.
  return JSON.stringify(clean, null, 2);
}

interface SpecificationsEditorProps {
  value: string;
  onChange: (json: string) => void;
}

export function SpecificationsEditor({ value, onChange }: SpecificationsEditorProps) {
  const [mode, setMode] = useState<"visual" | "json">("visual");
  // The parsed groups are the editable source of truth in visual mode.
  const [groups, setGroups] = useState<SpecGroupDraft[]>(() => parseSpecGroups(value) ?? []);
  const [jsonDraft, setJsonDraft] = useState(value || "[]");
  const [jsonError, setJsonError] = useState(false);
  const isJsonFormat = parseSpecGroups(value) !== null || value.trim() === "";

  const updateGroups = (next: SpecGroupDraft[]) => {
    setGroups(next);
    onChange(serializeSpecGroups(next));
    setJsonDraft(serializeSpecGroups(next));
    setJsonError(false);
  };

  const switchToVisual = () => {
    // Re-parse the current raw value so JSON-mode edits are reflected.
    const parsed = parseSpecGroups(value);
    if (parsed === null) {
      setJsonError(true);
      return;
    }
    setGroups(parsed);
    setMode("visual");
    setJsonError(false);
  };

  const switchToJson = () => {
    setJsonDraft(value || "[]");
    setMode("json");
  };

  const setRow = (gi: number, ri: number, field: "label" | "value", text: string) => {
    const next = groups.map((g, i) =>
      i === gi ? { ...g, rows: g.rows.map((r, j) => (j === ri ? { ...r, [field]: text } : r)) } : g,
    );
    updateGroups(next);
  };

  const addRow = (gi: number) => {
    updateGroups(groups.map((g, i) => (i === gi ? { ...g, rows: [...g.rows, { label: "", value: "" }] } : g)));
  };

  const removeRow = (gi: number, ri: number) => {
    updateGroups(groups.map((g, i) => (i === gi ? { ...g, rows: g.rows.filter((_, j) => j !== ri) } : g)));
  };

  const removeGroup = (gi: number) => {
    updateGroups(groups.filter((_, i) => i !== gi));
  };

  const setGroupName = (gi: number, name: string) => {
    updateGroups(groups.map((g, i) => (i === gi ? { ...g, group: name } : g)));
  };

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex items-center gap-1 rounded-md border border-border bg-muted/40 p-1 w-fit">
        <button
          type="button"
          onClick={() => switchToVisual()}
          aria-pressed={mode === "visual"}
          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${mode === "visual" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          Vista espansa
        </button>
        <button
          type="button"
          onClick={() => switchToJson()}
          aria-pressed={mode === "json"}
          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${mode === "json" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          JSON
        </button>
      </div>

      {!isJsonFormat && mode === "visual" ? (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Il contenuto attuale è in formato HTML legacy (non JSON): usa la vista &quot;JSON&quot; per gestirlo, oppure
          riscrivilo qui sotto — il salvataggio lo convertirà nel nuovo formato.
        </p>
      ) : null}

      {mode === "json" ? (
        <div>
          <label htmlFor="prod-specs-json" className="sr-only">
            Specifiche tecniche (JSON esteso)
          </label>
          <textarea
            id="prod-specs-json"
            value={jsonDraft}
            onChange={(e) => {
              const text = e.target.value;
              setJsonDraft(text);
              setJsonError(false);
              onChange(text);
            }}
            rows={16}
            spellCheck={false}
            placeholder='[{ "group": "Display", "rows": [{ "label": "Risoluzione", "value": "3440 x 1440" }] }]'
            className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs focus-visible:ring-2 focus-visible:ring-ring"
          />
          {jsonError && (
            <p className="mt-1 text-xs text-destructive">
              JSON non valido per la vista espansa: correggi il testo oppure continua a modificarlo qui.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {groups.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Nessun gruppo di specifiche. Aggiungi un gruppo per iniziare (o usa la vista JSON).
            </p>
          )}
          {groups.map((group, gi) => (
            <div key={gi} className="rounded-md border border-border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <label htmlFor={`spec-group-${gi}`} className="sr-only">
                  Nome gruppo
                </label>
                <input
                  id={`spec-group-${gi}`}
                  type="text"
                  value={group.group}
                  onChange={(e) => setGroupName(gi, e.target.value)}
                  placeholder="Nome gruppo (es. Display)"
                  className="flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => removeGroup(gi)}
                  className="rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  aria-label={`Rimuovi gruppo ${group.group || gi + 1}`}
                >
                  Rimuovi gruppo
                </button>
              </div>
              <div className="space-y-1.5">
                {group.rows.map((row, ri) => (
                  <div key={ri} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={row.label}
                      onChange={(e) => setRow(gi, ri, "label", e.target.value)}
                      placeholder="Etichetta (es. Risoluzione)"
                      aria-label={`Etichetta ${ri + 1} di ${group.group || "gruppo"}`}
                      className="w-2/5 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <input
                      type="text"
                      value={row.value}
                      onChange={(e) => setRow(gi, ri, "value", e.target.value)}
                      placeholder="Valore (es. 3440 x 1440)"
                      aria-label={`Valore ${ri + 1} di ${group.group || "gruppo"}`}
                      className="flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={() => removeRow(gi, ri)}
                      className="rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      aria-label={`Rimuovi riga ${ri + 1}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addRow(gi)}
                  className="text-xs font-medium text-primary hover:opacity-80 transition-opacity"
                >
                  + Aggiungi riga
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => updateGroups([...groups, { group: "", rows: [{ label: "", value: "" }] }])}
            className="rounded-md border border-dashed border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
          >
            + Aggiungi gruppo
          </button>
        </div>
      )}
    </div>
  );
}
