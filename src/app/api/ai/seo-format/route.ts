import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

const DEFAULT_PROMPT = `Sei un esperto SEO e copywriter italiano specializzato in e-commerce di informatica.

Il tuo compito è analizzare e riformattare contenuti HTML di pagine prodotto/blog per massimizzare il SEO on-page.

REGOLE:
1. **Struttura heading gerarchica**: H1 (solo titolo principale) → H2 (sezioni) → H3 (sottosezioni)
2. **Paragrafi proporzionati**: max 3-4 frasi per paragrafo. Nessun blocco di testo troppo lungo.
3. **Keyword positioning**: la parola chiave principale deve apparire in H1, primo paragrafo, e almeno un H2.
4. **Readability**: frasi chiare e concise. Evita gergo eccessivo.
5. **Semantica HTML**: usa <strong> solo per enfasi, mai per titoli. Usa <ul>/<ol> per liste.
6. **Link**: se ci sono link, assicurati abbiano anchor text descrittivi.
7. **Immagini**: se presenti, aggiungi o migliora l'attributo alt text.
8. **Rispondi SOLO con JSON valido**, nessun altro testo.

FORMATO RISPOSTA (JSON):
{
  "formatted": "HTML riformattato",
  "meta": {
    "title": "Meta title (max 60 caratteri)",
    "description": "Meta description (max 160 caratteri)",
    "keywords": ["keyword1", "keyword2"]
  },
  "changes": [
    "Elenco delle modifiche principali apportate"
  ]
}`;

async function getPrompt(): Promise<string> {
  try {
    const result = await pool.query(
      `SELECT value FROM store_setting WHERE key = 'seo_format_prompt'`
    );
    if (result.rows.length > 0 && result.rows[0].value) {
      return result.rows[0].value;
    }
  } catch {
    // If DB query fails, fall back to default
    console.warn("[SEO-FORMAT] Could not fetch prompt from DB, using default");
  }
  return DEFAULT_PROMPT;
}

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    if (!DEEPSEEK_API_KEY) {
      return NextResponse.json(
        { error: "DEEPSEEK_API_KEY non configurata. Aggiungila nel .env" },
        { status: 500 }
      );
    }

    const seoPrompt = await getPrompt();

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: seoPrompt },
          {
            role: "user",
            content: `Riformatta questo contenuto HTML per SEO:\n\n${content}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 4096,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[SEO-FORMAT] DeepSeek error:", response.status, errText.slice(0, 500));
      return NextResponse.json(
        { error: `DeepSeek API error: ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      return NextResponse.json({ error: "Risposta vuota da DeepSeek." }, { status: 502 });
    }

    // Parse JSON (handle possible markdown fences)
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Formato risposta non valido." }, { status: 502 });
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
