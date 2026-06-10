"use client";

import CategoryFiltersSection from "@/components/admin/category-filters-section";

export function CategoryFiltersSectionWrapper({
  categoryId,
  categoryName,
  parentName,
}: {
  categoryId: string;
  categoryName?: string;
  parentName?: string;
}) {
  return (
    <CategoryFiltersSection
      categoryId={categoryId}
      categoryName={categoryName}
      parentName={parentName}
    />
  );
}
