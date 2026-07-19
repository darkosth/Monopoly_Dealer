import prisma from "@/lib/prisma";
import { problem } from "@/lib/heads-up/api";
import { isAdminRequest } from "@/lib/heads-up/adminAuth";
import { validateCategoryInput } from "@/lib/heads-up/catalogValidation";

export const dynamic = "force-dynamic";
const slugify = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export async function GET() {
  if (!(await isAdminRequest())) return problem(401, "Unauthorized", "Administrator access is required.");
  const categories = await prisma.headsUpCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { nameEs: "asc" }], include: { options: { orderBy: [{ sortOrder: "asc" }, { textEs: "asc" }] } } });
  return Response.json({ categories });
}

export async function POST(request) {
  if (!(await isAdminRequest())) return problem(401, "Unauthorized", "Administrator access is required.");
  const result = validateCategoryInput(await request.json().catch(() => ({})));
  if (!result.ok) return problem(400, "Invalid category", result.error);
  const category = await prisma.headsUpCategory.create({ data: { ...result.data, slug: `${slugify(result.data.nameEn)}-${Date.now().toString(36)}` } });
  return Response.json({ category }, { status: 201 });
}
