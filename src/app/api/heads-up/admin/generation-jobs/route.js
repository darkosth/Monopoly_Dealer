import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { problem } from "@/lib/heads-up/api";
import { isAdminRequest } from "@/lib/heads-up/adminAuth";
import { validateGenerationRequest } from "@/lib/heads-up/generationValidation";
import { isSameOriginMutation } from "@/lib/heads-up/mutationSecurity";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function POST(request) {
  if (!(await isAdminRequest())) return problem(401, "Unauthorized", "Administrator access is required.");
  if (!isSameOriginMutation(request)) return problem(403, "Forbidden", "The request origin is not allowed.");

  const validation = validateGenerationRequest(await request.json().catch(() => ({})));
  if (!validation.ok) return problem(400, "Invalid generation request", validation.error);

  try {
    const job = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('heads-up-generation-rate-limit'))`;
      const since = new Date(Date.now() - 60 * 60 * 1000);
      const recentCount = await tx.headsUpGenerationJob.count({ where: { createdAt: { gte: since } } });
      if (recentCount >= 10) throw new Error("GENERATION_RATE_LIMIT");

      const activeCount = await tx.headsUpGenerationJob.count({
        where: { status: { in: ["PENDING", "RUNNING"] } },
      });
      if (activeCount > 0) throw new Error("GENERATION_BUSY");

      return tx.headsUpGenerationJob.create({
        data: {
          requestName: validation.data.name,
          explanation: validation.data.explanation,
          instructions: validation.data.instructions,
        },
        select: { id: true, status: true, createdAt: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return Response.json({ job }, { status: 202, headers: NO_STORE });
  } catch (error) {
    if (error.message === "GENERATION_RATE_LIMIT") {
      return Response.json(
        { type: "about:blank", title: "Too many requests", status: 429, detail: "Se permiten 10 generaciones por hora." },
        { status: 429, headers: { ...NO_STORE, "Retry-After": "3600", "Content-Type": "application/problem+json" } },
      );
    }
    if (error.message === "GENERATION_BUSY" || error.code === "P2002" || error.code === "P2034") {
      return Response.json(
        { type: "about:blank", title: "Generator busy", status: 409, detail: "Ya hay una categoría generándose." },
        { status: 409, headers: { ...NO_STORE, "Content-Type": "application/problem+json" } },
      );
    }
    console.error("Heads Up generation enqueue failed", { code: error.code || "UNKNOWN" });
    return problem(500, "Generation unavailable", "No se pudo iniciar la generación.");
  }
}
