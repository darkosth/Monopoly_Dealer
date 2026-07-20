import prisma from "@/lib/prisma";
import { problem } from "@/lib/heads-up/api";
import { isAdminRequest } from "@/lib/heads-up/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  if (!(await isAdminRequest())) return problem(401, "Unauthorized", "Administrator access is required.");
  const { jobId } = await params;
  const job = await prisma.headsUpGenerationJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      status: true,
      result: true,
      errorCode: true,
      createdAt: true,
      updatedAt: true,
      category: { select: { id: true } },
    },
  });
  if (!job) return problem(404, "Generation not found", "La generación ya no existe.");

  return Response.json({
    job: {
      id: job.id,
      status: job.status,
      result: job.status === "READY" ? job.result : null,
      error: job.status === "FAILED" ? "Yuri no pudo generar esta categoría." : null,
      categoryId: job.category?.id || null,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    },
  }, { headers: { "Cache-Control": "private, no-store" } });
}
