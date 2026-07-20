import prisma from "@/lib/prisma";
import { problem } from "@/lib/heads-up/api";
import { isAdminRequest } from "@/lib/heads-up/adminAuth";
import { validateCatalogBatchInput } from "@/lib/heads-up/catalogValidation";
import { isSameOriginMutation } from "@/lib/heads-up/mutationSecurity";

const slugify = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export async function POST(request, { params }) {
  if (!(await isAdminRequest())) return problem(401, "Unauthorized", "Administrator access is required.");
  if (!isSameOriginMutation(request)) return problem(403, "Forbidden", "The request origin is not allowed.");
  const { jobId } = await params;
  const validation = validateCatalogBatchInput(await request.json().catch(() => ({})));
  if (!validation.ok) return problem(400, "Invalid generated draft", validation.error);
  if (validation.data.options.length === 0) return problem(400, "Invalid generated draft", "The category needs at least one option.");

  try {
    const category = await prisma.$transaction(async (tx) => {
      const existing = await tx.headsUpCategory.findUnique({
        where: { generationJobId: jobId },
        include: { options: { orderBy: [{ sortOrder: "asc" }, { textEs: "asc" }] } },
      });
      if (existing) return existing;

      const claimed = await tx.headsUpGenerationJob.updateMany({
        where: { id: jobId, status: "READY" },
        data: { status: "IMPORTED", importedAt: new Date() },
      });
      if (claimed.count !== 1) throw new Error("GENERATION_NOT_READY");

      const maximum = await tx.headsUpCategory.aggregate({ _max: { sortOrder: true } });
      return tx.headsUpCategory.create({
        data: {
          ...validation.data.category,
          sortOrder: (maximum._max.sortOrder ?? -1) + 1,
          slug: `${slugify(validation.data.category.nameEn) || "category"}-${Date.now().toString(36)}`,
          generationJobId: jobId,
          options: { create: validation.data.options.map(({ id: _id, ...option }, index) => ({ ...option, sortOrder: index })) },
        },
        include: { options: { orderBy: [{ sortOrder: "asc" }, { textEs: "asc" }] } },
      });
    });
    return Response.json({ category }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error.message === "GENERATION_NOT_READY") {
      return problem(409, "Generation not ready", "La categoría aún no está lista o ya no se puede importar.");
    }
    console.error("Heads Up generated category import failed", { code: error.code || "UNKNOWN" });
    return problem(500, "Import unavailable", "No se pudo guardar la categoría generada.");
  }
}
