import PageForm from "@/components/admin/page-form";

export default async function EditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="max-w-5xl mx-auto">
      <PageForm pageId={id} />
    </div>
  );
}
