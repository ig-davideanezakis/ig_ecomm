"use client";

import CategoryFiltersSection from "@/components/admin/category-filters-section";

export function CategoryFiltersSectionWrapper({
  categoryId,
  parentName,
}: {
  categoryId: string;
  parentName?: string;
}) {
  return (
    <CategoryFiltersSection
      categoryId={categoryId}
      parentName={parentName}
    />
  );
}
