import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

const DEFAULT_PROMPT = `Sei un esperto SEO e copywriter italiano specializzato in e-commerce di informatica.
Il tuo compito e' analizzare e riformattare contenuti HTML di pagine prodotto/blog per massimizzare il SEO on-page.
REGOLE:
1. Struttura heading gerarchica: H1 -> H2 -> H3
2. Paragrafi proporzionati: max 3-4 frasi per paragrafo
3. Keyword positioning: la parola chiave principale in H1, primo paragrafo, e almeno un H2
4. Readability: frasi chiare e concise
5. Semantica HTML: <strong> per enfasi, <ul>/<ol> per liste
6. Link: anchor text descrittivi
7. Immagini: aggiungi o migliora alt text`;

const FORMAT_SUFFIX = [
  "",
  "Rispondi SOLO con JSON valido in questo formato (nessun altro testo):",
  '{ "formatted": "HTML riformattato",',
  '  "meta": { "title": "...", "description": "...", "keywords": [] },',
  '  "changes": ["Modifica 1", "Modifica 2"] }',
].join("\n");

async function getPrompt(): Promise<string> {
  try {
    const result = await pool.query(
      `SELECT value FROM store_setting WHERE key = 'seo_format_prompt'`
    );
    if (result.rows.length > 0 && result.rows[0].value) {
      return result.rows[0].value;
    }
  } catch {
    console.warn("[SEO-FORMAT] DB fallback to default prompt");
  }
  return DEFAULT_PROMPT;
}

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();
    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }
    if (!DEEPSEEK_API_KEY) {
      return NextResponse.json({ error: "DEEPSEEK_API_KEY mancante" }, { status: 500 });
    }

    const seoPrompt = await getPrompt();
    // Always append format instructions so custom prompts return valid JSON
    const finalPrompt = seoPrompt + FORMAT_SUFFIX;

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: finalPrompt },
          { role: "user", content: "Riformatta questo HTML per SEO:\n" + content },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[SEO-FORMAT] DeepSeek error:", response.status, errText.slice(0, 200));
      return NextResponse.json({ error: "Errore dal provider AI" }, { status: 502 });
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;
    if (!rawContent) {
      return NextResponse.json({ error: "Risposta vuota" }, { status: 502 });
    }

    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[SEO-FORMAT] Bad response:", rawContent.slice(0, 500));
      return NextResponse.json({ error: "Formato risposta non valido" }, { status: 502 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({
      formatted: parsed.formatted || content,
      meta: parsed.meta || null,
      changes: parsed.changes || [],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Errore sconosciuto";
    console.error("[SEO-FORMAT] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
