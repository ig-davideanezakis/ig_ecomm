import CategoryForm from "@/components/admin/category-form";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="max-w-5xl mx-auto">
      <CategoryForm categoryId={id} />
    </div>
  );
}
