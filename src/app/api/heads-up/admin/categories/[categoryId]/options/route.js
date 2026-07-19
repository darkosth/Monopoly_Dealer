import prisma from "@/lib/prisma";
import { problem } from "@/lib/heads-up/api";
import { isAdminRequest } from "@/lib/heads-up/adminAuth";
import { validateOptionInput } from "@/lib/heads-up/catalogValidation";

export async function POST(request, { params }) {
  if (!(await isAdminRequest())) return problem(401, "Unauthorized", "Administrator access is required.");
  const { categoryId } = await params;
  const result = validateOptionInput(await request.json().catch(() => ({})));
  if (!result.ok) return problem(400, "Invalid option", result.error);
  const option = await prisma.headsUpOption.create({ data: { ...result.data, categoryId } });
  return Response.json({ option }, { status: 201 });
}
