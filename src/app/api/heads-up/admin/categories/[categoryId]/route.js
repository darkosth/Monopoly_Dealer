import prisma from "@/lib/prisma";
import { problem } from "@/lib/heads-up/api";
import { isAdminRequest } from "@/lib/heads-up/adminAuth";
import { validateCategoryInput } from "@/lib/heads-up/catalogValidation";

export async function PATCH(request, { params }) {
  if (!(await isAdminRequest())) return problem(401, "Unauthorized", "Administrator access is required.");
  const { categoryId } = await params;
  const result = validateCategoryInput(await request.json().catch(() => ({})));
  if (!result.ok) return problem(400, "Invalid category", result.error);
  const category = await prisma.headsUpCategory.update({ where: { id: categoryId }, data: result.data });
  return Response.json({ category });
}
