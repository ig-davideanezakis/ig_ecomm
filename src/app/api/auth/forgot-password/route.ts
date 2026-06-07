import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import crypto from "crypto";
import { Resend } from "resend";
import { forgotPasswordSchema, validateOrThrow } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = await validateOrThrow(forgotPasswordSchema, body);

    const userResult = await pool.query(`SELECT id FROM "user" WHERE email = $1 LIMIT 1`, [email]);
    if (userResult.rows.length === 0) return NextResponse.json({ success: true }); // Prevent enumeration

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO verification_token (identifier, token, expires) VALUES ($1, $2, $3)
       ON CONFLICT (identifier, token) DO UPDATE SET token = $2, expires = $3`,
      [email, token, expires]);

    const baseUrl = request.headers.get("origin") || process.env.AUTH_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    const resendApiKey = process.env.AUTH_RESEND_KEY;
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: "onboarding@resend.dev",
          to: email,
          subject: "Reimposta la tua password — Infograf Store",
          html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
            <h2>Reimposta la tua password</h2>
            <p>Clicca sul pulsante qui sotto per reimpostare la password del tuo account Infograf Store.</p>
            <a href="${resetUrl}" style="display:inline-block;background:#ff0c3c;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">Reimposta password</a>
            <p style="color:#666;font-size:13px;">Questo link scade tra 1 ora.<br>Se non hai richiesto tu il reset, ignora questa email.</p></div>`,
        });
      } catch { /* Silent fail */ }
    }

    console.log(`[FORGOT PASSWORD] Reset link: ${resetUrl}`);

    return NextResponse.json({
      success: true,
      ...(process.env.NODE_ENV !== "production" ? { devLink: resetUrl } : {}),
    });
  } catch (err) {
    if (err instanceof Response) {
      const text = await err.text();
      return NextResponse.json(JSON.parse(text), { status: err.status });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore." }, { status: 500 });
  }
}
