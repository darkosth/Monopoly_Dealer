import prisma from "@/lib/prisma";
import { problem } from "@/lib/heads-up/api";
import { isAdminRequest } from "@/lib/heads-up/adminAuth";
import { validateCatalogBatchInput, validateCategoryInput } from "@/lib/heads-up/catalogValidation";

export async function PATCH(request, { params }) {
  if (!(await isAdminRequest())) return problem(401, "Unauthorized", "Administrator access is required.");
  const { categoryId } = await params;
  const result = validateCategoryInput(await request.json().catch(() => ({})));
  if (!result.ok) return problem(400, "Invalid category", result.error);
  const category = await prisma.headsUpCategory.update({ where: { id: categoryId }, data: result.data });
  return Response.json({ category });
}

export async function PUT(request, { params }) {
  if (!(await isAdminRequest())) return problem(401, "Unauthorized", "Administrator access is required.");
  const { categoryId } = await params;
  const result = validateCatalogBatchInput(await request.json().catch(() => ({})));
  if (!result.ok) return problem(400, "Invalid catalog draft", result.error);

  const current = await prisma.headsUpCategory.findUnique({
    where: { id: categoryId },
    select: { id: true, options: { select: { id: true } } },
  });
  if (!current) return problem(404, "Category not found", "The selected category no longer exists.");

  const existingIds = new Set(current.options.map((option) => option.id));
  const submittedIds = result.data.options.flatMap((option) => option.id ? [option.id] : []);
  if (submittedIds.some((id) => !existingIds.has(id))) {
    return problem(400, "Invalid catalog draft", "Every persisted option must belong to the selected category.");
  }

  const submittedIdSet = new Set(submittedIds);
  const archivedIds = current.options.map((option) => option.id).filter((id) => !submittedIdSet.has(id));

  const category = await prisma.$transaction(async (tx) => {
    await tx.headsUpCategory.update({ where: { id: categoryId }, data: result.data.category });

    if (archivedIds.length) {
      await tx.headsUpOption.updateMany({
        where: { categoryId, id: { in: archivedIds } },
        data: { isActive: false },
      });
    }

    await Promise.all(result.data.options.map(({ id, ...option }) => id
      ? tx.headsUpOption.update({ where: { id }, data: option })
      : tx.headsUpOption.create({ data: { ...option, categoryId } })));

    return tx.headsUpCategory.findUnique({
      where: { id: categoryId },
      include: { options: { orderBy: [{ sortOrder: "asc" }, { textEs: "asc" }] } },
    });
  });

  return Response.json({ category });
}
