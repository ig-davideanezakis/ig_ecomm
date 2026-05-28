import "dotenv/config";
import { getProductList, getProductBySlug } from "../src/db/queries";

async function main() {
  const list = await getProductList({ limit: 2 });
  console.log("✅ getProductList:", list.products.length, "products,", list.pagination.total, "total");
  console.log("   Filters:", list.filters.categories.length, "categories");

  const slug = list.products[0]?.slug;
  if (slug) {
    const product = await getProductBySlug(slug);
    console.log("✅ getProductBySlug:", product?.title, "-", product?.images?.length, "images,", product?.variants?.length, "variants");
  }
}
main().catch((e) => console.error("❌ Error:", e.message));
