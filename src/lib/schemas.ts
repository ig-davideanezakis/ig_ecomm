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

interface FlatCategory {
  id: string; name: string; slug: string; description: string | null;
  image: string | null; icon: string | null;
  parent_id: string | null; sort_order: number;
  seo_title: string | null; seo_description: string | null;
  noindex: boolean; is_active: boolean;
  active_from: string | null; active_until: string | null;
  created_at: string; updated_at: string;
  product_count: number;
}

interface TreeNode {
  id: string; name: string; slug: string; parent_id: string | null;
  sort_order: number; is_active: boolean; noindex: boolean;
  image: string | null; icon: string | null;
  active_from: string | null; active_until: string | null;
  product_count: number;
  children: TreeNode[];
}

export type { FlatCategory, TreeNode };
