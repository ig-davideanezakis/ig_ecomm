/**
 * Shared renderer for the product "specifiche tecniche" field.
 *
 * The field is stored in two possible formats:
 *   1. Structured JSON of Icecat FeaturesGroups (new imports):
 *      [{ "group": "Display", "rows": [{ "label": "Risoluzione", "value": "3440 x 1440" }] }]
 *   2. Legacy flat HTML table (older imports) — rendered as-is.
 *
 * Used by the shop product page and by the admin form live preview.
 */

export interface SpecRow {
  label: string;
  value: string;
}

export interface SpecGroupData {
  group: string;
  rows: SpecRow[];
}

export type SpecificationsData =
  | { kind: "groups"; groups: SpecGroupData[] }
  | { kind: "html"; html: string };

/** Parse the stored value into a renderable structure (null when empty). */
export function parseSpecifications(raw: string | null | undefined): SpecificationsData | null {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (
        Array.isArray(parsed) &&
        parsed.every(
          (g) =>
            g &&
            typeof (g as SpecGroupData).group === "string" &&
            Array.isArray((g as SpecGroupData).rows) &&
            (g as SpecGroupData).rows.every(
              (r) => r && typeof r.label === "string" && typeof r.value === "string",
            ),
        )
      ) {
        const groups = (parsed as SpecGroupData[]).filter((g) => g.rows.length > 0);
        if (groups.length > 0) return { kind: "groups", groups };
      }
    } catch {
      // not valid JSON → fall through to legacy HTML
    }
  }
  return { kind: "html", html: raw };
}

/** Render a single group as a zebra-striped two-column table. */
function SpecTable({ rows }: { rows: SpecRow[] }) {
  return (
    <table className="w-full border-collapse text-sm">
      <tbody>
        {rows.map((row, i) => (
          <tr key={`${row.label}-${i}`} className={i % 2 === 1 ? "bg-muted/30" : undefined}>
            <td className="w-2/5 px-4 py-2 align-top text-muted-foreground">{row.label}</td>
            <td className="px-4 py-2 align-top font-medium">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Renders the specifications field (grouped JSON or legacy HTML). */
export default function SpecificationsView({
  value,
  className = "",
}: {
  value: string | null | undefined;
  className?: string;
}) {
  const data = parseSpecifications(value);
  if (!data) return null;

  if (data.kind === "html") {
    return (
      <div
        className={`product-rich-content ${className}`}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: data.html }}
      />
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {data.groups.map((group) => (
        <div key={group.group || "altro"}>
          {group.group && (
            <h3 className="mb-3 text-base font-semibold uppercase tracking-wide text-foreground">
              {group.group}
            </h3>
          )}
          <div className="overflow-hidden rounded-lg border">
            <SpecTable rows={group.rows} />
          </div>
        </div>
      ))}
    </div>
  );
}
