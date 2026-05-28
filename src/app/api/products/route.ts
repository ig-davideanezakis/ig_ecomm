import { NextRequest, NextResponse } from "next/server";
import { getProductList } from "@/db/queries";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const result = await getProductList({
      search: searchParams.get("search")?.trim() || "",
      category: searchParams.get("category")?.trim() || "",
      brand: searchParams.get("brand")?.trim() || "",
      minPrice: searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined,
      maxPrice: searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined,
      sort: searchParams.get("sort")?.trim() || "newest",
      page: Math.max(1, Number(searchParams.get("page")) || 1),
      limit: Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 12)),
    });

    return NextResponse.json({
      products: result.products,
      pagination: result.pagination,
      filters: result.filters,
    });
  } catch (error) {
    console.error("GET /api/products error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 },
    );
  }
}
