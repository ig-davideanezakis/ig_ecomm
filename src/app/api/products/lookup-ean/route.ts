import { NextResponse } from "next/server";
import { lookupProductByEan } from "@/lib/icecat";

const ICECAT_USER = process.env.ICECAT_USERNAME || "";
const ICECAT_KEY = process.env.ICECAT_KEY || "";
const HAS_CREDENTIALS = Boolean(ICECAT_USER && ICECAT_KEY);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ean = searchParams.get("ean")?.trim();

  if (!ean || ean.length < 8) {
    return NextResponse.json({ error: "EAN non valido (minimo 8 cifre)." }, { status: 400 });
  }

  if (!HAS_CREDENTIALS) {
    return NextResponse.json({ found: false, error: "Icecat credentials not configured." }, { status: 503 });
  }

  // ── Icecat Live API (live.icecat.biz/api) ─────────────────────────
  try {
    console.log(`[ICECAT] Looking up EAN ${ean} via live.icecat.biz/api...`);
    const result = await lookupProductByEan(ean);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[ICECAT] Lookup failed: ${msg}`);
    return NextResponse.json({ found: false, error: `Icecat error: ${msg}` }, { status: 502 });
  }
}
