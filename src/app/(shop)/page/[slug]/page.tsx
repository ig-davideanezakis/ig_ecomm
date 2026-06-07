import { pool } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function PublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const result = await pool.query(
    `SELECT title, content, excerpt, created_at, updated_at
     FROM "page" WHERE slug = $1 AND published = true LIMIT 1`,
    [slug],
  );

  if (result.rows.length === 0) {
    notFound();
  }

  const page = result.rows[0];

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link href="/" className="text-sm text-primary hover:underline mb-4 inline-block">← Torna alla homepage</Link>
      <h1 className="text-3xl font-bold mt-4 mb-2">{page.title}</h1>
      {page.excerpt && (
        <p className="text-lg text-muted-foreground mb-8">{page.excerpt}</p>
      )}
      <div
        className="prose prose-sm dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: page.content }}
      />
      <div className="mt-12 pt-6 border-t text-xs text-muted-foreground">
        Ultimo aggiornamento: {new Date(page.updated_at).toLocaleDateString("it-IT")}
      </div>
    </article>
  );
}
