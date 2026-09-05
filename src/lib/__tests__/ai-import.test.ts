import { describe, expect, it, vi } from "vitest";

// Isolate the pure helpers from the pg pool import
vi.mock("@/lib/db", () => ({ pool: { query: vi.fn() } }));

import {
  DEFAULT_IMPORT_PROMPT,
  extractImageUrls,
  htmlToText,
  isBlockedImportUrl,
  parseImportJson,
} from "@/lib/ai-import";

describe("isBlockedImportUrl", () => {
  it("allows public https/http URLs", () => {
    expect(isBlockedImportUrl("https://www.asus.com/it/laptops/x")).toBe(false);
    expect(isBlockedImportUrl("http://example.com/p")).toBe(false);
  });

  it("blocks non-http(s) protocols and malformed URLs", () => {
    expect(isBlockedImportUrl("ftp://example.com/x")).toBe(true);
    expect(isBlockedImportUrl("not-a-url")).toBe(true);
    expect(isBlockedImportUrl("")).toBe(true);
  });

  it("blocks private, loopback and metadata hosts", () => {
    expect(isBlockedImportUrl("http://localhost:3000/x")).toBe(true);
    expect(isBlockedImportUrl("http://127.0.0.1/x")).toBe(true);
    expect(isBlockedImportUrl("http://10.0.0.5/x")).toBe(true);
    expect(isBlockedImportUrl("http://192.168.1.10/x")).toBe(true);
    expect(isBlockedImportUrl("http://169.254.169.254/latest/meta-data")).toBe(true);
    expect(isBlockedImportUrl("http://172.16.0.1/x")).toBe(true);
    expect(isBlockedImportUrl("http://metadata.google.internal/x")).toBe(true);
  });
});

describe("htmlToText", () => {
  it("strips scripts/styles/tags and keeps text", () => {
    const html =
      "<html><head><style>.a{}</style></head><body><script>var x=1;</script><p>Ciao <strong>mondo</strong></p><div>Secondo</div></body></html>";
    const text = htmlToText(html);
    expect(text).not.toContain("var x");
    expect(text).not.toContain("<p>");
    expect(text).toContain("Ciao mondo");
    expect(text).toContain("Secondo");
  });
});

describe("extractImageUrls", () => {
  it("resolves relative URLs against the base and dedupes", () => {
    const html = '<img src="/img/a.jpg"><img src="/img/b.jpg"><img src="/img/a.jpg"><img src="https://cdn.x/c.jpg">';
    const urls = extractImageUrls(html, "https://www.asus.com/it/page");
    expect(urls).toEqual([
      "https://www.asus.com/img/a.jpg",
      "https://www.asus.com/img/b.jpg",
      "https://cdn.x/c.jpg",
    ]);
  });
});

describe("parseImportJson", () => {
  it("maps a full model response to the Icecat shape", () => {
    const raw = `Ecco i dati:
    {
      "titolo": "ASUS ROG Strix X",
      "marca": "ASUS",
      "descrizioneBreve": "Monitor QD-OLED 34 pollici",
      "descrizioneLunga": "<p>Monitor gaming</p>",
      "puntiChiave": "HDR True Black 400\\n180 Hz",
      "specifiche": [{"label":"Risoluzione","value":"3440x1440"}],
      "gruppiSpecifiche": [{"group":"Display","rows":[{"label":"Risoluzione","value":"3440x1440"}]}],
      "pesoKg": 6.8,
      "dimensioni": {"larghezza":"80 cm","altezza":"50 cm","profondita":"20 cm"},
      "immagini": [{"url":"https://img/a.jpg","alt":""}],
      "categoriaSuggerita": "Monitor",
      "ean": ""
    }`;
    const data = parseImportJson(raw);
    expect(data.found).toBe(true);
    expect(data.title).toBe("ASUS ROG Strix X");
    expect(data.brand).toBe("ASUS");
    expect(data.weight).toBe(6.8);
    expect(data.dimensions.width).toBe("80 cm");
    expect(data.specs).toHaveLength(1);
    expect(data.specGroups).toHaveLength(1);
    expect(data.specGroups[0].group).toBe("Display");
    expect(data.bulletPoints).toContain("180 Hz");
    expect(data.images[0].alt).toBe("ASUS ROG Strix X - ASUS"); // alt fallback
  });

  it("throws on a response without JSON", () => {
    expect(() => parseImportJson("nessun json qui")).toThrow();
  });
});

describe("DEFAULT_IMPORT_PROMPT", () => {
  it("is a non-empty instruction set", () => {
    expect(DEFAULT_IMPORT_PROMPT.length).toBeGreaterThan(100);
    expect(DEFAULT_IMPORT_PROMPT).toMatch(/titolo|specifiche|immagini/i);
  });
});
