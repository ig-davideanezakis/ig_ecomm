import ProductForm from "@/components/admin/product-form";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ importError?: string }>;
}) {
  const { id } = await params;
  const { importError } = await searchParams;

  return (
    <div className="w-full max-w-[1680px] mx-auto">
      <ProductForm productId={id} initialImportError={importError} />
    </div>
  );
}
