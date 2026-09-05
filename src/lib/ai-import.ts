/**
 * AI-assisted product import from a manufacturer/campaign URL.
 *
 * Icecat only covers a subset of the catalog; some products must be imported
 * from the manufacturer's product page (e.g. an ASUS URL). This module fetches
 * the page server-side, strips it down to readable text + image URLs, and asks
 * DeepSeek to extract the SAME structured shape that Icecat returns
 * (`IcecatProductData`), so the existing IcecatDialog / applyIcecatSelection
 * template is reused unchanged.
 */

import { z } from "zod";
import { pool } from "@/lib/db";
import type { IcecatProductData } from "@/lib/icecat";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const TIMEOUT_MS = 20000;
const MAX_PAGE_CHARS = 60000; // cap the text sent to the model
const MAX_IMAGES = 12;

// ─── SSRF guard ────────────────────────────────────────────────────

/** Reject non-http(s) URLs and private/localhost/metadata hosts. */
export function isBlockedImportUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return true;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return true;
  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "::1" ||
    host === "0.0.0.0" ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host.endsWith(".local") ||
    host === "metadata.google.internal"
  ) {
    return true;
  }
  return false;
}

// ─── Page extraction (pure, unit-testable) ─────────────────────────

/** Strip scripts/styles/svg and tags, keeping paragraph breaks. */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

/** Collect absolute image URLs from <img src>, resolving relative paths. */
export function extractImageUrls(html: string, baseUrl: string): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const abs = new URL(m[1], baseUrl).toString();
      if ((abs.startsWith("http://") || abs.startsWith("https://")) && !seen.has(abs)) {
        seen.add(abs);
        urls.push(abs);
      }
    } catch {
      /* skip malformed */
    }
    if (urls.length >= MAX_IMAGES) break;
  }
  return urls;
}

// ─── Prompt ────────────────────────────────────────────────────────

export const DEFAULT_IMPORT_PROMPT = `Sei un assistente esperto di schede prodotto per un negozio di informatica italiano. Analizza la pagina web fornita (testo estratto + elenco URL delle immagini) ed estrai i dati del prodotto in italiano.

Regole:
- titolo: nome completo del prodotto (marca + modello)
- marca: solo il nome del produttore (es. ASUS)
- descrizioneBreve: 1-2 frasi di sintesi del prodotto
- descrizioneLunga: descrizione completa in HTML semplice (paragrafi <p> e liste <ul>), senza intestazioni di pagina/nav
- puntiChiave: elenco dei punti di forza, uno per riga (separati da newline)
- specifiche: TUTTE le caratteristiche tecniche come coppie etichetta/valore
- gruppiSpecifiche: le stesse specifiche raggruppate per categoria (es. "Display", "Processore", "Memoria")
- pesoKg: peso in kg come numero (es. 1.9), oppure null se assente
- dimensioni: oggetto { larghezza, altezza, profondita } in cm (stringhe), vuoto se assente
- immagini: array degli URL assoluti delle foto prodotto (usa quelli forniti)
- categoriaSuggerita: categoria merceologica (es. "Notebook")
- ean: codice EAN/GTIN se presente nella pagina, altrimenti stringa vuota
- Se un dato non è disponibile usa "" o null. Non inventare valori.`;

const IMPORT_FORMAT_SUFFIX = [
  "",
  "Rispondi SOLO con JSON valido in questo formato (nessun altro testo):",
  '{',
  '  "titolo": "...",',
  '  "marca": "...",',
  '  "descrizioneBreve": "...",',
  '  "descrizioneLunga": "...",',
  '  "puntiChiave": "punto1\\npunto2",',
  '  "specifiche": [{ "label": "...", "value": "..." }],',
  '  "gruppiSpecifiche": [{ "group": "...", "rows": [{ "label": "...", "value": "..." }] }],',
  '  "pesoKg": 1.9,',
  '  "dimensioni": { "larghezza": "...", "altezza": "...", "profondita": "..." },',
  '  "immagini": [{ "url": "https://...", "alt": "..." }],',
  '  "categoriaSuggerita": "...",',
  '  "ean": ""',
  "}",
].join("\n");

/** Editable prompt stored in settings (`url_import_prompt`), default above. */
export async function getImportPrompt(): Promise<string> {
  try {
    const result = await pool.query(
      `SELECT value FROM store_setting WHERE key = 'url_import_prompt'`,
    );
    if (result.rows.length > 0 && result.rows[0].value) {
      return result.rows[0].value;
    }
  } catch {
    console.warn("[URL-IMPORT] DB fallback to default prompt");
  }
  return DEFAULT_IMPORT_PROMPT;
}

// ─── Response parsing (pure, unit-testable) ────────────────────────

const importSchema = z.object({
  titolo: z.string().optional().default(""),
  marca: z.string().optional().default(""),
  descrizioneBreve: z.string().optional().default(""),
  descrizioneLunga: z.string().optional().default(""),
  puntiChiave: z.string().optional().default(""),
  specifiche: z.array(z.object({ label: z.string(), value: z.string() })).optional().default([]),
  gruppiSpecifiche: z
    .array(z.object({ group: z.string(), rows: z.array(z.object({ label: z.string(), value: z.string() })) }))
    .optional()
    .default([]),
  pesoKg: z.number().nullable().optional().default(null),
  dimensioni: z
    .object({ larghezza: z.string(), altezza: z.string(), profondita: z.string() })
    .optional()
    .default({ larghezza: "", altezza: "", profondita: "" }),
  immagini: z.array(z.object({ url: z.string(), alt: z.string().optional().default("") })).optional().default([]),
  categoriaSuggerita: z.string().optional().default(""),
  ean: z.string().optional().default(""),
});

/** Map the model's JSON output to the Icecat shape the dialog/form already use. */
export function parseImportJson(raw: string): IcecatProductData {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Risposta AI non valida (nessun JSON).");

  const parsed = importSchema.parse(JSON.parse(jsonMatch[0]));

  const specGroups = parsed.gruppiSpecifiche
    .map((g) => ({ group: g.group, rows: g.rows.filter((r) => r.label && r.value) }))
    .filter((g) => g.rows.length > 0);

  return {
    found: true,
    title: parsed.titolo,
    brand: parsed.marca,
    brandLogo: "",
    shortDesc: parsed.descrizioneBreve,
    longDesc: parsed.descrizioneLunga,
    weight: parsed.pesoKg,
    dimensions: {
      width: parsed.dimensioni.larghezza,
      height: parsed.dimensioni.altezza,
      depth: parsed.dimensioni.profondita,
    },
    images: parsed.immagini.map((i) => ({ url: i.url, alt: i.alt || `${parsed.titolo} - ${parsed.marca}` })),
    specs: parsed.specifiche.filter((s) => s.label && s.value),
    specGroups,
    bulletPoints: parsed.puntiChiave,
    categoryHint: parsed.categoriaSuggerita,
    ean: parsed.ean,
  };
}

// ─── Main lookup ───────────────────────────────────────────────────

export async function lookupProductByUrl(url: string): Promise<IcecatProductData> {
  if (isBlockedImportUrl(url)) {
    throw new Error("URL non consentito (protocollo o host non ammesso).");
  }
  if (!DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY mancante.");
  }

  // 1. Fetch the page server-side (avoids CORS; the model can't fetch URLs).
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; InfografStoreBot/1.0; +https://infografstore.it)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`Pagina non disponibile (HTTP ${res.status}).`);
    html = await res.text();
  } finally {
    clearTimeout(timeout);
  }

  const text = htmlToText(html).slice(0, MAX_PAGE_CHARS);
  const images = extractImageUrls(html, url);

  const prompt = (await getImportPrompt()) + IMPORT_FORMAT_SUFFIX;
  const userContent = [
    `URL: ${url}`,
    "",
    "TESTO DELLA PAGINA (estratto):",
    text || "(nessun testo leggibile)",
    "",
    "IMMAGINI TROVATE NELLA PAGINA:",
    images.length ? images.join("\n") : "(nessuna)",
  ].join("\n");

  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.2,
      max_tokens: 8192,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[URL-IMPORT] DeepSeek error:", response.status, errText.slice(0, 200));
    throw new Error("Errore dal provider AI.");
  }

  const data = await response.json();
  const rawContent: unknown = data?.choices?.[0]?.message?.content;
  if (!rawContent || typeof rawContent !== "string") {
    throw new Error("Risposta AI vuota.");
  }

  return parseImportJson(rawContent);
}
