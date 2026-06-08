import { NextResponse } from "next/server";
import { authorize } from "@/lib/auth-helpers";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const MODEL = "deepseek-chat";

/**
 * POST /api/admin/seo/generate
 * Uses DeepSeek AI to generate SEO fields from form data.
 *
 * Body: { type: "product" | "category", title, description, parentName? }
 * Response: { seoTitle, seoDescription }
 */
export async function POST(request: Request) {
  try { await authorize("ADMIN"); } catch {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  if (!DEEPSEEK_API_KEY) {
    return NextResponse.json(
      { error: "DEEPSEEK_API_KEY non configurata. Aggiungila a .env" },
      { status: 500 },
    );
  }

  try {
    const { type, title, description, parentName } = await request.json();

    if (!title) {
      return NextResponse.json({ error: "Titolo richiesto." }, { status: 400 });
    }

    const storeName = "Infograf Store";
    const context =
      type === "category"
        ? `Categoria: ${title}${parentName ? ` (sottocategoria di ${parentName})` : ""}`
        : `Prodotto: ${title}`;

    const descText = description
      ? `\nDescrizione: ${description.replace(/<[^>]*>/g, "").slice(0, 300)}`
      : "";

    const prompt = `Sei un esperto SEO per e-commerce italiano. Genera meta title e meta description per:
${context}${descText}

Requisiti:
- Meta title: max 60 caratteri, includi "${storeName}" alla fine separato da " | "
- Meta description: max 160 caratteri, naturale e invitante per il click, in italiano
- Non usare virgolette nel testo
- Rispondi SOLO con JSON: { "seoTitle": "...", "seoDescription": "..." }`;

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[SEO GENERATE] DeepSeek error:", response.status, errText.slice(0, 500));
      return NextResponse.json(
        { error: `DeepSeek API error: ${response.status} — ${errText.slice(0, 200)}` },
        { status: 502 },
      );
    }

    const data = await response.json();
    console.log("[SEO GENERATE] DeepSeek raw response:", JSON.stringify(data).slice(0, 500));
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: "Risposta vuota da DeepSeek." }, { status: 502 });
    }

    // Parse JSON from response (handle possible markdown fences)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Formato risposta non valido." }, { status: 502 });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      seoTitle: (parsed.seoTitle || "").slice(0, 60),
      seoDescription: (parsed.seoDescription || "").slice(0, 160),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Errore sconosciuto.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
