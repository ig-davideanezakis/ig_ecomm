import {
  generateSecret,
  generateURI,
  verify,
} from "otplib";
import QRCode from "qrcode";

// ─── TOTP parameters ──────────────────────────────────────────────

const TOTP_CONFIG = {
  period: 30,
  digits: 6,
} as const;

// ─── Generate a new TOTP secret ───────────────────────────────────

export function generateTotpSecret(): string {
  return generateSecret();
}

// ─── Generate a QR code data URL for the authenticator app ─────────

export async function generateTotpQrCode(
  secret: string,
  email: string,
  issuer: string = "Infograf Store",
): Promise<string> {
  const uri = generateURI({
    strategy: "totp",
    issuer,
    label: email,
    secret,
    digits: TOTP_CONFIG.digits,
  });

  return QRCode.toDataURL(uri, {
    width: 300,
    margin: 2,
    color: {
      dark: "#0a0c10",
      light: "#ffffff",
    },
  });
}

// ─── Verify a TOTP token ──────────────────────────────────────────

export async function verifyTotp(
  token: string,
  secret: string,
): Promise<boolean> {
  try {
    const result = await verify({
      token,
      secret,
      ...TOTP_CONFIG,
    });
    return result.valid === true;
  } catch {
    return false;
  }
}

// ─── Get the remaining seconds in the current TOTP window ─────────

export function getTotpRemainingSeconds(): number {
  return TOTP_CONFIG.period - Math.floor((Date.now() / 1000) % TOTP_CONFIG.period);
}
