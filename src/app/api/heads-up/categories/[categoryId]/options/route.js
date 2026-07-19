import prisma from "@/lib/prisma";
import { problem } from "@/lib/heads-up/api";
import { parseLanguage } from "@/lib/heads-up/catalogValidation";
import { getFallbackCategory } from "@/lib/heads-up/fallbackCatalog.mjs";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { categoryId } = await params;
  const language = parseLanguage(new URL(request.url).searchParams.get("lang"));
  if (categoryId.startsWith("seed:")) {
    const fallback = getFallbackCategory(categoryId, language);
    return fallback ? Response.json({ source: "seed", ...fallback }) : problem(404, "Category not found", "The selected category is unavailable.");
  }
  try {
    const category = await prisma.headsUpCategory.findFirst({ where: { id: categoryId, isActive: true }, select: { id: true, nameEs: true, nameEn: true } });
    if (!category) return problem(404, "Category not found", "The selected category is unavailable.");
    const options = await prisma.headsUpOption.findMany({ where: { categoryId, isActive: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true, textEs: true, textEn: true, imageUrl: true } });
    return Response.json({ source: "database", category: { id: category.id, name: language === "en" ? category.nameEn : category.nameEs }, options: options.map((option) => ({ id: option.id, text: language === "en" ? option.textEn : option.textEs, imageUrl: option.imageUrl })) });
  } catch {
    const fallback = getFallbackCategory(categoryId, language);
    return fallback ? Response.json({ source: "seed", ...fallback }) : problem(503, "Catalog unavailable", "The catalog database is unavailable.");
  }
}
