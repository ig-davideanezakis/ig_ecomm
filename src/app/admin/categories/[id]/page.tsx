import CategoryForm from "@/components/admin/category-form";
import { pool } from "@/lib/db";
import { CategoryFiltersSectionWrapper } from "./filters-section";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Get category info for the filters section
  const catRes = await pool.query(
    `SELECT c.id, c.name, c.slug,
      CASE WHEN p.id IS NOT NULL THEN jsonb_build_object('id', p.id, 'name', p.name) ELSE NULL END as parent
     FROM "category" c
     LEFT JOIN "category" p ON p.id = c.parent_id
     WHERE c.id = $1`, [id]
  );
  const category = catRes.rows[0] || null;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <CategoryForm categoryId={id} />
      {category && (
        <CategoryFiltersSectionWrapper
          categoryId={category.id}
          parentName={category.parent?.name}
        />
      )}
    </div>
  );
}
