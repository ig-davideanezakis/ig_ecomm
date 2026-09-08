import { describe, it, expect, vi } from "vitest";
import {
  extractFilterValues,
  extractFilterValue,
  extractChipValues,
  normalizeSpecLabel,
  syncAutoFilterValues,
} from "@/lib/filter-values";

// ─── Fixtures (grounded in real Icecat IT imports, ported from spec-chips) ─

const laptopSpecs = JSON.stringify([
  {
    group: "Display",
    rows: [{ label: "Dimensioni diagonale schermo", value: '35,6 cm (14")' }],
  },
  {
    group: "Processore",
    rows: [
      { label: "Produttore processore", value: "Intel" },
      { label: "Famiglia processore", value: "Intel Core Ultra 9" },
      { label: "Modello del processore", value: "386H" },
      { label: "Frequenza del processore turbo massima", value: "4,9 GHz" },
    ],
  },
  {
    group: "Memoria",
    rows: [{ label: "RAM installata", value: "32 GB" }],
  },
]);

const CPU: { id: string; patterns: string[]; exclude: string[] } = {
  id: "cpu",
  patterns: ["famiglia processore", "modello del processore", "processore"],
  exclude: ["frequenza", "produttore"],
};
const RAM = { id: "ram", patterns: ["ram installata"] };

// ─── extractFilterValues ────────────────────────────────────────────

describe("extractFilterValues", () => {
  it("extracts every configured filter's value from a product's specifications", () => {
    const values = extractFilterValues(laptopSpecs, [CPU, RAM]);
    expect(values.get("cpu")).toBe("Intel Core Ultra 9");
    expect(values.get("ram")).toBe("32 GB");
  });

  it("prefers famiglia over modello and ignores freq/produttore rows", () => {
    const values = extractFilterValues(laptopSpecs, [CPU]);
    expect(values.get("cpu")).toBe("Intel Core Ultra 9");
  });

  it("does not reuse a row already claimed by an earlier filter", () => {
    const config = [
      { id: "a", patterns: ["famiglia processore"] },
      { id: "b", patterns: ["processore"] },
    ];
    const specs = JSON.stringify([
      {
        group: "Processore",
        rows: [
          { label: "Famiglia processore", value: "Intel Core i7" },
          { label: "Produttore processore", value: "Intel" },
        ],
      },
    ]);
    const values = extractFilterValues(specs, config);
    expect(values.get("a")).toBe("Intel Core i7");
    expect(values.get("b")).toBe("Intel");
  });

  it("respects a custom exclude list", () => {
    const config = [{ id: "x", patterns: ["schermo"], exclude: ["diagonale"] }];
    const specs = JSON.stringify([
      { group: "Display", rows: [{ label: "Dimensioni diagonale schermo", value: '14"' }] },
    ]);
    expect(extractFilterValues(specs, config).size).toBe(0);
  });

  it("returns an empty map for legacy HTML specs, null/empty specs, or an empty config", () => {
    expect(extractFilterValues("<table><tr><td>CPU</td></tr></table>", [CPU]).size).toBe(0);
    expect(extractFilterValues(null, [CPU]).size).toBe(0);
    expect(extractFilterValues("", [CPU]).size).toBe(0);
    expect(extractFilterValues(laptopSpecs, []).size).toBe(0);
  });

  it("returns an empty map for malformed JSON", () => {
    expect(extractFilterValues("[{oops", [CPU]).size).toBe(0);
  });
});

describe("extractFilterValue", () => {
  it("returns the single matched value, or null when nothing matches", () => {
    expect(extractFilterValue(laptopSpecs, CPU)).toBe("Intel Core Ultra 9");
    expect(extractFilterValue(laptopSpecs, { id: "x", patterns: ["nope"] })).toBeNull();
  });
});

describe("extractChipValues", () => {
  it("returns chip display data in config order, not document order", () => {
    const configs = [
      { id: "os", label: "OS", icon: "app-window", patterns: ["sistema operativo"] },
      { id: "cpu", label: "CPU", icon: "cpu", patterns: ["famiglia processore"] },
    ];
    const chips = extractChipValues(laptopSpecs, configs);
    expect(chips.map((c) => c.id)).toEqual(["cpu"]); // no "sistema operativo" row in this fixture
    expect(chips[0]).toEqual({ id: "cpu", label: "CPU", icon: "cpu", value: "Intel Core Ultra 9" });
  });

  it("omits a chip with no match instead of an empty value", () => {
    const chips = extractChipValues(laptopSpecs, [
      { id: "x", label: "X", icon: "tag", patterns: ["nonexistent"] },
    ]);
    expect(chips).toEqual([]);
  });
});

describe("normalizeSpecLabel", () => {
  it("lowercases and strips accents and punctuation", () => {
    expect(normalizeSpecLabel("Capacità (max)")).toBe("capacita max");
  });
});

// ─── syncAutoFilterValues ───────────────────────────────────────────

function makeDb(responses: Array<{ rows: Record<string, unknown>[] }>) {
  const query = vi.fn();
  for (const r of responses) query.mockResolvedValueOnce(r);
  return { query };
}

describe("syncAutoFilterValues", () => {
  it("upserts the derived value for each auto filter, replacing the previous one", async () => {
    const db = makeDb([
      { rows: [{ id: "cpu", patterns: JSON.stringify(CPU.patterns), exclude: JSON.stringify(CPU.exclude) }] }, // auto filters
      { rows: [] }, // no overrides
      { rows: [] }, // DELETE
      { rows: [] }, // INSERT
    ]);

    await syncAutoFilterValues(db, "prod1", laptopSpecs);

    expect(db.query.mock.calls[0][0]).toContain("value_mode = 'auto'");
    expect(db.query.mock.calls[2][0]).toContain("DELETE FROM");
    expect(db.query.mock.calls[2][1]).toEqual(["prod1", ["cpu"]]);
    expect(db.query.mock.calls[3][0]).toContain("INSERT INTO");
    expect(db.query.mock.calls[3][1]).toEqual(["prod1", "cpu", "Intel Core Ultra 9"]);
  });

  it("never touches a filter the admin has manually overridden", async () => {
    const db = makeDb([
      { rows: [{ id: "cpu", patterns: JSON.stringify(CPU.patterns), exclude: JSON.stringify(CPU.exclude) }] },
      { rows: [{ filter_id: "cpu" }] }, // cpu is overridden
    ]);

    await syncAutoFilterValues(db, "prod1", laptopSpecs);

    // Only the two SELECTs ran — no DELETE/INSERT for the overridden filter.
    expect(db.query).toHaveBeenCalledTimes(2);
  });

  it("does nothing when there are no auto-mode filters configured", async () => {
    const db = makeDb([{ rows: [] }]);
    await syncAutoFilterValues(db, "prod1", laptopSpecs);
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it("deletes without inserting when the specifications no longer match anything", async () => {
    const db = makeDb([
      { rows: [{ id: "cpu", patterns: JSON.stringify(CPU.patterns), exclude: JSON.stringify(CPU.exclude) }] },
      { rows: [] },
      { rows: [] }, // DELETE
    ]);

    await syncAutoFilterValues(db, "prod1", null);

    expect(db.query).toHaveBeenCalledTimes(3); // no INSERT — nothing derived
    expect(db.query.mock.calls[2][0]).toContain("DELETE FROM");
  });
});
