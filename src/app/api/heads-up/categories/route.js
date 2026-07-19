import prisma from "@/lib/prisma";
import { parseLanguage } from "@/lib/heads-up/catalogValidation";
import { getFallbackCategories } from "@/lib/heads-up/fallbackCatalog.mjs";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const language = parseLanguage(new URL(request.url).searchParams.get("lang"));
  try {
    const categories = await prisma.headsUpCategory.findMany({
      where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { nameEs: "asc" }],
      select: { id: true, slug: true, nameEs: true, nameEn: true, _count: { select: { options: { where: { isActive: true } } } } },
    });
    return Response.json({ language, source: "database", categories: categories.map((category) => ({ id: category.id, slug: category.slug, name: language === "en" ? category.nameEn : category.nameEs, optionCount: category._count.options })) });
  } catch {
    return Response.json({ language, source: "seed", categories: getFallbackCategories(language) });
  }
}
