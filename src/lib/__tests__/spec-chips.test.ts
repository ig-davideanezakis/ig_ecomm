import { describe, it, expect } from "vitest";
import {
  DEFAULT_SPEC_CHIPS,
  extractSpecChips,
  normalizeSpecLabel,
  parseSpecChipsConfig,
} from "@/lib/spec-chips";

// ─── Fixtures (grounded in real Icecat IT imports) ────────────────

/** Zenbook-like laptop: every default chip present. */
const laptopSpecs = JSON.stringify([
  {
    group: "Design",
    rows: [
      { label: "Tipo di prodotto", value: "Computer portatile" },
      { label: "Colore del prodotto", value: "Bianco" },
    ],
  },
  {
    group: "Display",
    rows: [
      { label: "Dimensioni diagonale schermo", value: '35,6 cm (14")' },
      { label: "Risoluzione del display", value: "2880 x 1800 Pixel" },
      { label: "Tipo di pannello", value: "OLED" },
    ],
  },
  {
    group: "Processore",
    rows: [
      { label: "Produttore processore", value: "Intel" },
      { label: "Famiglia processore", value: "Intel Core Ultra 9" },
      { label: "Modello del processore", value: "386H" },
      { label: "Frequenza del processore turbo massima", value: "4,9 GHz" },
      { label: "Numero di core del processore", value: "16" },
    ],
  },
  {
    group: "Memoria",
    rows: [
      { label: "RAM installata", value: "32 GB" },
      { label: "Tipo di RAM", value: "LPDDR5x" },
    ],
  },
  {
    group: "Archiviazione",
    rows: [
      { label: "Capacità memoria integrata", value: "1 TB" },
      { label: "Interfaccia Solid State Drive (SSD)", value: "PCI Express 4.0" },
    ],
  },
  {
    group: "Grafica",
    rows: [{ label: "Processore grafico", value: "Intel Arc Graphics 140V" }],
  },
  {
    group: "Software",
    rows: [
      { label: "Sistema operativo incluso", value: "Windows 11 Home" },
      { label: "Versione sistema operativo", value: "11 Home" },
    ],
  },
]);

/** ROG Ally-like handheld: storage uses "integrata", CPU only has "modello". */
const handheldSpecs = JSON.stringify([
  {
    group: "Prestazione",
    rows: [
      { label: "Piattaforma", value: "ASUS ROG Ally" },
      { label: "Dimensione SSD", value: "M.2" },
      { label: "Architettura processore", value: "AMD 3x Zen 5" },
      { label: "Modello del processore", value: "AMD Ryzen AI Z2 Extreme" },
      { label: "Frequenza del processore", value: "3300 MHz" },
      { label: "Processore grafico", value: "AMD Radeon Graphics" },
      { label: "RAM installata", value: "24000 MB" },
      { label: "Tipo di RAM", value: "LPDDR5x" },
    ],
  },
  {
    group: "Archiviazione",
    rows: [
      { label: "Capacità memoria integrata", value: "1 TB" },
      { label: "Lettore di schede integrato", value: "Sì" },
    ],
  },
]);

// ─── extractSpecChips ─────────────────────────────────────────────

describe("extractSpecChips", () => {
  it("extracts all default chips from a laptop specification", () => {
    const chips = extractSpecChips(laptopSpecs, DEFAULT_SPEC_CHIPS);
    expect(chips.map((c) => c.id)).toEqual(["cpu", "ram", "storage", "display", "gpu", "os"]);
    expect(chips.find((c) => c.id === "cpu")?.value).toBe("Intel Core Ultra 9");
    expect(chips.find((c) => c.id === "ram")?.value).toBe("32 GB");
    expect(chips.find((c) => c.id === "storage")?.value).toBe("1 TB");
    expect(chips.find((c) => c.id === "display")?.value).toBe('35,6 cm (14")');
    expect(chips.find((c) => c.id === "gpu")?.value).toBe("Intel Arc Graphics 140V");
    expect(chips.find((c) => c.id === "os")?.value).toBe("Windows 11 Home");
  });

  it("keeps the display label/value and icon mapping intact", () => {
    const chips = extractSpecChips(laptopSpecs, DEFAULT_SPEC_CHIPS);
    const display = chips.find((c) => c.id === "display");
    expect(display?.label).toBe("Schermo");
    expect(display?.icon).toBe("monitor");
  });

  it("prefers famiglia over modello and ignores freq/produttore rows", () => {
    const chips = extractSpecChips(laptopSpecs, DEFAULT_SPEC_CHIPS);
    expect(chips.find((c) => c.id === "cpu")?.value).toBe("Intel Core Ultra 9");
  });

  it("falls back to modello when famiglia is absent", () => {
    const chips = extractSpecChips(handheldSpecs, DEFAULT_SPEC_CHIPS);
    expect(chips.find((c) => c.id === "cpu")?.value).toBe("AMD Ryzen AI Z2 Extreme");
    expect(chips.find((c) => c.id === "ram")?.value).toBe("24000 MB");
    expect(chips.find((c) => c.id === "storage")?.value).toBe("1 TB");
    expect(chips.find((c) => c.id === "gpu")?.value).toBe("AMD Radeon Graphics");
  });

  it("does not feed a frequency-only row to the CPU chip", () => {
    const specs = JSON.stringify([
      { group: "Processore", rows: [{ label: "Frequenza del processore", value: "3,5 GHz" }] },
    ]);
    const chips = extractSpecChips(specs, DEFAULT_SPEC_CHIPS);
    expect(chips.find((c) => c.id === "cpu")).toBeUndefined();
  });

  it("does not reuse a row already claimed by an earlier chip", () => {
    const config = [
      { id: "a", label: "A", icon: "tag", patterns: ["famiglia processore"] },
      { id: "b", label: "B", icon: "tag", patterns: ["processore"] },
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
    const chips = extractSpecChips(specs, config);
    expect(chips.map((c) => c.id)).toEqual(["a", "b"]);
    expect(chips[0].value).toBe("Intel Core i7");
    expect(chips[1].value).toBe("Intel");
  });

  it("respects a custom exclude list", () => {
    const config = [
      { id: "x", label: "X", icon: "tag", patterns: ["schermo"], exclude: ["diagonale"] },
    ];
    const specs = JSON.stringify([
      { group: "Display", rows: [{ label: "Dimensioni diagonale schermo", value: '14"' }] },
    ]);
    expect(extractSpecChips(specs, config)).toEqual([]);
  });

  it("keeps the configured config order, not the document order", () => {
    const config = [
      { id: "os", label: "OS", icon: "tag", patterns: ["sistema operativo"] },
      { id: "cpu", label: "CPU", icon: "tag", patterns: ["famiglia processore"] },
    ];
    const chips = extractSpecChips(laptopSpecs, config);
    expect(chips.map((c) => c.id)).toEqual(["os", "cpu"]);
  });

  it("returns [] for legacy HTML specifications", () => {
    expect(extractSpecChips("<table><tr><td>CPU</td></tr></table>", DEFAULT_SPEC_CHIPS)).toEqual([]);
  });

  it("returns [] for null/empty specs and for an empty config", () => {
    expect(extractSpecChips(null, DEFAULT_SPEC_CHIPS)).toEqual([]);
    expect(extractSpecChips("", DEFAULT_SPEC_CHIPS)).toEqual([]);
    expect(extractSpecChips(laptopSpecs, [])).toEqual([]);
  });

  it("returns [] for malformed JSON", () => {
    expect(extractSpecChips("[{oops", DEFAULT_SPEC_CHIPS)).toEqual([]);
  });
});

// ─── normalizeSpecLabel ───────────────────────────────────────────

describe("normalizeSpecLabel", () => {
  it("lowercases and strips accents and punctuation", () => {
    expect(normalizeSpecLabel("Frequenza del Processore Turbo Massima")).toBe(
      "frequenza del processore turbo massima",
    );
    expect(normalizeSpecLabel("Wi-Fi 6E (802.11ax)")).toBe("wi fi 6e 802 11ax");
    expect(normalizeSpecLabel("Memoria  d'archivio")).toBe("memoria d archivio");
    expect(normalizeSpecLabel("Larghezza (max)")).toBe("larghezza max");
  });
});

// ─── parseSpecChipsConfig ─────────────────────────────────────────

describe("parseSpecChipsConfig", () => {
  it("returns null for absent/empty/malformed values (callers use defaults)", () => {
    expect(parseSpecChipsConfig(null)).toBeNull();
    expect(parseSpecChipsConfig("")).toBeNull();
    expect(parseSpecChipsConfig("   ")).toBeNull();
    expect(parseSpecChipsConfig("not json")).toBeNull();
    expect(parseSpecChipsConfig('{"a":1}')).toBeNull();
  });

  it("keeps an explicit empty array (chips disabled)", () => {
    expect(parseSpecChipsConfig("[]")).toEqual([]);
  });

  it("normalizes patterns and drops entries without patterns", () => {
    const raw = JSON.stringify([
      { id: "cpu", label: "CPU", icon: "cpu", patterns: ["Famiglia Processore", "  modello  "] },
      { id: "bad", label: "Senza pattern", icon: "tag", patterns: [] },
      { id: "no-id", label: "RAM", icon: "tag", patterns: ["Ram Installata"] },
      { id: "drops", patterns: [] },
    ]);
    const config = parseSpecChipsConfig(raw)!;
    expect(config.length).toBe(2);
    expect(config[0].id).toBe("cpu");
    expect(config[0].patterns).toEqual(["famiglia processore", "modello"]);
    expect(config[1].id).toBe("no-id");
    expect(config[1].patterns).toEqual(["ram installata"]);
  });

  it("defaults icon to tag and label to the first pattern when missing", () => {
    const raw = JSON.stringify([{ id: "x", patterns: ["memoria interna"] }]);
    const config = parseSpecChipsConfig(raw)!;
    expect(config[0].icon).toBe("tag");
    expect(config[0].label).toBe("memoria interna");
  });
});
