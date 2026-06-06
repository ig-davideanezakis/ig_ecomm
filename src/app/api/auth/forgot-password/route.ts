import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import crypto from "crypto";
import { Resend } from "resend";

/**
 * POST /api/auth/forgot-password
 * Generates a secure token, stores it in verification_token table,
 * and sends a password reset link via email.
 *
 * The reset link is: /auth/reset-password?token=xxx&email=yyy
 * Token expires after 1 hour.
 */
export async function POST(request: Request) {
  const { email } = await request.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email richiesta." }, { status: 400 });
  }

  // Check user exists
  const userResult = await pool.query(
    `SELECT id FROM "user" WHERE email = $1 LIMIT 1`,
    [email],
  );
  if (userResult.rows.length === 0) {
    // Don't reveal whether email exists (prevents enumeration)
    return NextResponse.json({ success: true });
  }

  // Generate secure token
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Store in verification_token table
  await pool.query(
    `INSERT INTO verification_token (identifier, token, expires)
     VALUES ($1, $2, $3)
     ON CONFLICT (identifier, token) DO UPDATE SET token = $2, expires = $3`,
    [email, token, expires],
  );

  // Build reset link from the request's origin (reflects the actual domain the user is on)
  // This correctly handles Vercel production domains vs preview deployment domains.
  const baseUrl = request.headers.get("origin") || process.env.AUTH_URL || "http://localhost:3000";
  const resetUrl = `${baseUrl}/auth/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

  // Try to send email via Resend
  const resendApiKey = process.env.AUTH_RESEND_KEY;
  if (resendApiKey) {
    try {
      const resend = new Resend(resendApiKey);
      await resend.emails.send({
        from: "onboarding@resend.dev",
        to: email,
        subject: "Reimposta la tua password — Infograf Store",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
            <h2>Reimposta la tua password</h2>
            <p>Clicca sul pulsante qui sotto per reimpostare la password del tuo account Infograf Store.</p>
            <a href="${resetUrl}"
               style="display:inline-block;background:#ff0c3c;color:#fff;padding:12px 24px;
                      border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">
              Reimposta password
            </a>
            <p style="color:#666;font-size:13px;">Questo link scade tra 1 ora.<br>
            Se non hai richiesto tu il reset, ignora questa email.</p>
          </div>
        `,
      });
    } catch {
      // Silently fail — in dev/test the link is logged below
    }
  }

  // In dev, log the link so tests can use it
  console.log(`[FORGOT PASSWORD] Reset link: ${resetUrl}`);

  return NextResponse.json({
    success: true,
    // In dev mode, return the link so tests can verify the flow
    ...(process.env.NODE_ENV !== "production" ? { devLink: resetUrl } : {}),
  });
}
