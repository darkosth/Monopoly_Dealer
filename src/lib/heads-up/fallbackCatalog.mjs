import { HEADS_UP_CATALOG } from "../../../prisma/data/heads-up-catalog.mjs";

export function getFallbackCategories(language) {
  return HEADS_UP_CATALOG.map((category) => ({
    id: `seed:${category.slug}`,
    slug: category.slug,
    name: language === "en" ? category.nameEn : category.nameEs,
    optionCount: category.options.length,
  }));
}

export function getFallbackCategory(categoryId, language) {
  const slug = categoryId.startsWith("seed:") ? categoryId.slice(5) : categoryId;
  const category = HEADS_UP_CATALOG.find((item) => item.slug === slug);
  if (!category) return null;
  return {
    category: { id: `seed:${category.slug}`, name: language === "en" ? category.nameEn : category.nameEs },
    options: category.options.map((option, index) => ({ id: `seed:${category.slug}:${index}`, text: language === "en" ? option.textEn : option.textEs, imageUrl: null })),
  };
}
