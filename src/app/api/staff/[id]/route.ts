import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { staffProfiles } from "@/lib/db/schema";
import { user } from "@/lib/db/auth-schema";
import { apiGuard, handleRoute, jsonOk, logActivity, readJson } from "@/lib/api-utils";

const patchSchema = z.object({
  role: z.enum(["admin", "manager", "cashier", "salesman", "accountant"]).optional(),
  designation: z.string().max(80).optional(),
  phone: z.string().max(20).optional(),
  branchId: z.coerce.number().int().positive().nullable().optional(),
  commissionBp: z.coerce.number().int().min(0).max(10000).optional(),
  salesTargetPaise: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    const { session, response } = await apiGuard("admin");
    if (response) return response;
    const { id } = await params;
    if (!id) return jsonOk({ error: "Invalid staff member." }, 400);

    const { data, error } = await readJson(request, patchSchema);
    if (error) return error;

    const [target] = await db.select().from(user).where(eq(user.id, id)).limit(1);
    if (!target) return jsonOk({ error: "Staff member not found." }, 404);

    if (data.role || data.designation !== undefined || data.phone !== undefined) {
      await db
        .update(user)
        .set({
          role: data.role ?? target.role,
          designation: data.designation ?? target.designation,
          phone: data.phone ?? target.phone,
        })
        .where(eq(user.id, id));
    }

    const [existing] = await db
      .select()
      .from(staffProfiles)
      .where(eq(staffProfiles.userId, id))
      .limit(1);

    const values = {
      branchId: data.branchId !== undefined ? data.branchId : existing?.branchId ?? null,
      designation: data.designation ?? existing?.designation ?? null,
      phone: data.phone ?? existing?.phone ?? null,
      commissionBp: data.commissionBp ?? existing?.commissionBp ?? 0,
      salesTargetPaise: data.salesTargetPaise ?? existing?.salesTargetPaise ?? 0,
      isActive: data.isActive ?? existing?.isActive ?? true,
    };

    if (existing) {
      await db.update(staffProfiles).set(values).where(eq(staffProfiles.id, existing.id));
    } else {
      await db.insert(staffProfiles).values({ userId: id, ...values });
    }

    await logActivity(session, "staff.updated", "user", id, target.name);
    return jsonOk({ ok: true });
  });
}
