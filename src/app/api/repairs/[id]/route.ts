import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { repairs } from "@/lib/db/schema";
import { apiGuard, handleRoute, jsonOk, logActivity, readJson } from "@/lib/api-utils";

const patchSchema = z.object({
  status: z.enum(["received", "in_progress", "ready", "delivered", "cancelled"]).optional(),
  estimatedCostPaise: z.coerce.number().int().min(0).optional(),
  advancePaise: z.coerce.number().int().min(0).optional(),
  assignedTo: z.string().max(120).optional(),
  notes: z.string().max(500).optional(),
  promisedAt: z.string().optional().nullable(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    const { session, response } = await apiGuard("salesman");
    if (response) return response;
    const { id } = await params;
    const repairId = Number(id);
    if (!Number.isFinite(repairId)) return jsonOk({ error: "Invalid repair." }, 400);

    const { data, error } = await readJson(request, patchSchema);
    if (error) return error;

    const [existing] = await db.select().from(repairs).where(eq(repairs.id, repairId)).limit(1);
    if (!existing) return jsonOk({ error: "Repair not found." }, 404);

    const [repair] = await db
      .update(repairs)
      .set({
        status: data.status ?? existing.status,
        estimatedCostPaise: data.estimatedCostPaise ?? existing.estimatedCostPaise,
        advancePaise: data.advancePaise ?? existing.advancePaise,
        assignedTo: data.assignedTo ?? existing.assignedTo,
        notes: data.notes ?? existing.notes,
        promisedAt: data.promisedAt ? new Date(data.promisedAt) : existing.promisedAt,
        deliveredAt:
          data.status === "delivered" && !existing.deliveredAt ? new Date() : existing.deliveredAt,
      })
      .where(eq(repairs.id, repairId))
      .returning();

    await logActivity(
      session,
      "repair.updated",
      "repair",
      repair.id,
      `${repair.jobNo} → ${repair.status}`,
    );
    return jsonOk({ repair });
  });
}
