import prisma from "../src/lib/prisma.js";
import { HEADS_UP_CATALOG } from "./data/heads-up-catalog.mjs";

async function seed() {
  for (const [categoryIndex, categoryInput] of HEADS_UP_CATALOG.entries()) {
    const category = await prisma.headsUpCategory.upsert({
      where: { slug: categoryInput.slug },
      update: { nameEs: categoryInput.nameEs, nameEn: categoryInput.nameEn, isActive: true, sortOrder: categoryIndex },
      create: { slug: categoryInput.slug, nameEs: categoryInput.nameEs, nameEn: categoryInput.nameEn, sortOrder: categoryIndex },
    });

    const existing = await prisma.headsUpOption.findMany({ where: { categoryId: category.id }, select: { id: true, textEs: true, textEn: true } });
    const byTranslation = new Map(existing.map((option) => [`${option.textEs}\u0000${option.textEn}`, option.id]));

    for (const [optionIndex, option] of categoryInput.options.entries()) {
      const id = byTranslation.get(`${option.textEs}\u0000${option.textEn}`);
      if (id) {
        await prisma.headsUpOption.update({ where: { id }, data: { isActive: true, sortOrder: optionIndex } });
      } else {
        await prisma.headsUpOption.create({ data: { ...option, categoryId: category.id, sortOrder: optionIndex } });
      }
    }
  }
}

seed()
  .finally(async () => prisma.$disconnect());
