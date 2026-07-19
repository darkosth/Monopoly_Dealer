import prisma from "@/lib/prisma";
import { problem } from "@/lib/heads-up/api";
import { isAdminRequest } from "@/lib/heads-up/adminAuth";
import { validateOptionInput } from "@/lib/heads-up/catalogValidation";

export async function PATCH(request, { params }) {
  if (!(await isAdminRequest())) return problem(401, "Unauthorized", "Administrator access is required.");
  const { optionId } = await params;
  const result = validateOptionInput(await request.json().catch(() => ({})));
  if (!result.ok) return problem(400, "Invalid option", result.error);
  const option = await prisma.headsUpOption.update({ where: { id: optionId }, data: result.data });
  return Response.json({ option });
}
