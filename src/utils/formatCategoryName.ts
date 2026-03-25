export const formatCategoryName = (category: string) => {
  return category
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

/** Banner label from URL segment (slug). */
export const formatCategorySlug = (slug: string) => {
  if (slug === "gloves-mittens") return "Gloves / Mittens";
  return formatCategoryName(slug);
};