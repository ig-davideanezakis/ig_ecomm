import { z } from "zod";
import { validateOrThrow } from "./validation";

export const categorySchema = z.object({
  name: z.string().min(1, "Il nome è obbligatorio.").max(255),
  slug: z.string().max(255).optional(),
  description: z.string().optional().default(""),
  image: z.string().max(500).nullable().optional().default(null),
  icon: z.string().max(255).nullable().optional().default(null),
  parentId: z.string().max(255).nullable().optional().default(null),
  sortOrder: z.number().int().optional().default(0),
  seoTitle: z.string().max(255).nullable().optional().default(null),
  seoDescription: z.string().nullable().optional().default(null),
  noindex: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  activeFrom: z.string().nullable().optional().default(null),
  activeUntil: z.string().nullable().optional().default(null),
});

export type CategoryInput = z.infer<typeof categorySchema>;
