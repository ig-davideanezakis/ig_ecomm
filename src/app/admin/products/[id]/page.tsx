import ProductForm from "@/components/admin/product-form";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="max-w-5xl mx-auto">
      <ProductForm productId={id} />
    </div>
  );
}
