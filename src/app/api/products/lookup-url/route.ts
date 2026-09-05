import { NextResponse } from "next/server";
import { authorize } from "@/lib/auth-helpers";
import { lookupProductByUrl } from "@/lib/ai-import";

/**
 * POST /api/products/lookup-url
 * AI-assisted product import from a manufacturer/campaign URL.
 * Fetches the page server-side and asks DeepSeek to extract the same
 * structured data Icecat returns, so the admin form reuses the Icecat dialog.
 * ADMIN-only: it fetches arbitrary URLs (SSRF-guarded) and consumes AI credits.
 */
export async function POST(request: Request) {
  try {
    await authorize("ADMIN");
  } catch {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  let url: string;
  try {
    const body = await request.json();
    url = typeof body?.url === "string" ? body.url.trim() : "";
  } catch {
    return NextResponse.json({ error: "URL richiesto." }, { status: 400 });
  }

  if (!/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "URL non valido." }, { status: 400 });
  }

  try {
    const result = await lookupProductByUrl(url);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Errore sconosciuto";
    console.error(`[URL-IMPORT] Lookup failed: ${msg}`);
    return NextResponse.json({ found: false, error: msg }, { status: 502 });
  }
}
