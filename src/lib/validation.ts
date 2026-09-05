import { z } from "zod";

// ─── Product ──────────────────────────────────────────────────────

export const productSchema = z.object({
  title: z.string().min(1, "Il titolo è obbligatorio.").max(255),
  slug: z.string().max(255).optional(),
  identifier: z.string().max(255).optional(),
  description: z.string().optional().default(""),
  content: z.string().optional().default(""),
  /** Marketing/overview rich HTML — rendered in the "Panoramica" product tab. */
  overview: z.string().optional().default(""),
  specifications: z.string().optional().default(""),
  basePrice: z.number().min(0, "Il prezzo base deve essere positivo."),
  compareAtPrice: z.number().min(0).nullable().optional().default(null),
  costPrice: z.number().min(0).nullable().optional().default(null),
  sku: z.string().max(255).nullable().optional().default(null),
  barcode: z
    .string({ error: "Il GTIN (EAN/UPC) è obbligatorio." })
    .trim()
    .min(1, "Il GTIN (EAN/UPC) è obbligatorio.")
    .regex(/^\d{8,14}$/, "GTIN non valido: deve contenere 8-14 cifre."),
  /** GTIN used for the Icecat import — may differ from the real product EAN (barcode). */
  icecatCode: z.string().max(255).nullable().optional().default(null),
  /** Manufacturer URL last used for the AI import. */
  importUrl: z.string().max(1000).nullable().optional().default(null),
  weight: z.number().min(0).nullable().optional().default(null),
  seoTitle: z.string().max(255).nullable().optional().default(null),
  seoDescription: z.string().nullable().optional().default(null),
  published: z.boolean().optional().default(false),
  featured: z.boolean().optional().default(false),
  categoryId: z.string().max(255).nullable().optional().default(null),
  brandId: z.string().max(255).nullable().optional().default(null),
});

export type ProductInput = z.infer<typeof productSchema>;

// ─── Page ─────────────────────────────────────────────────────────

export const pageSchema = z.object({
  title: z.string().min(1, "Il titolo è obbligatorio.").max(255),
  slug: z.string().min(1, "Lo slug è obbligatorio.").max(255),
  content: z.string().optional().default(""),
  excerpt: z.string().nullable().optional().default(null),
  published: z.boolean().optional().default(true),
  showInFooter: z.boolean().optional().default(false),
  showInNav: z.boolean().optional().default(false),
  navOrder: z.number().int().optional().default(0),
  footerOrder: z.number().int().optional().default(0),
});

export type PageInput = z.infer<typeof pageSchema>;

// ─── Settings ─────────────────────────────────────────────────────

export const settingsSchema = z.record(z.string(), z.string());

// ─── Auth ─────────────────────────────────────────────────────────

export const registerSchema = z.object({
  email: z.string().email("Email non valida."),
  password: z.string().min(6, "Password: minimo 6 caratteri."),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email non valida."),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token richiesto."),
  email: z.string().email("Email non valida."),
  password: z.string().min(6, "Password: minimo 6 caratteri."),
});

export const checkEmailSchema = z.object({
  email: z.string().email("Email non valida."),
});

// ─── Checkout ─────────────────────────────────────────────────────

export const checkoutSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    variantId: z.string(),
    title: z.string(),
    price: z.number().min(0),
    quantity: z.number().int().min(1),
  })).min(1, "Carrello vuoto."),
  email: z.string().email("Email richiesta."),
  name: z.string().min(2, "Nome completo richiesto."),
  phone: z.string().optional().default(""),
  address: z.string().min(1, "Indirizzo richiesto."),
  city: z.string().min(1, "Città richiesta."),
  province: z.string().optional().default(""),
  zip: z.string().min(1, "CAP richiesto."),
  country: z.string().optional().default("IT"),
  shippingMethod: z.string().optional().default("standard"),
  paymentMethod: z.string().optional().default("card"),
  newsletterConsent: z.boolean().optional().default(false),
});

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Validates input against a Zod schema.
 * Returns { success: true, data } or throws a Response with the error message.
 */
export async function validateOrThrow<T>(
  schema: z.ZodSchema<T>,
  input: unknown,
): Promise<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const firstError = result.error.issues[0]?.message || "Dati non validi.";
    throw new Response(JSON.stringify({ error: firstError }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  return result.data;
}

/**
 * Safe parse — returns data or null with no throw (for usage where
 * you want to collect errors manually).
 */
export function validate<T>(schema: z.ZodSchema<T>, input: unknown): {
  success: boolean;
  data?: T;
  error?: string;
} {
  const result = schema.safeParse(input);
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message || "Dati non validi." };
  }
  return { success: true, data: result.data };
}
