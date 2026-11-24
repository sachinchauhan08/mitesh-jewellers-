import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { customers, repairs } from "@/lib/db/schema";
import { apiGuard, handleRoute, jsonOk, logActivity, readJson } from "@/lib/api-utils";
import { nextDocumentNumber } from "@/lib/documents";

const repairSchema = z.object({
  customerId: z.coerce.number().int().positive().optional().nullable(),
  branchId: z.coerce.number().int().positive().optional().nullable(),
  itemDescription: z.string().min(2, "Describe the item being repaired.").max(200),
  metalType: z.enum(["gold", "silver", "platinum", "other"]).default("gold"),
  grossWeightMg: z.coerce.number().int().min(0).default(0),
  issue: z.string().max(500).optional(),
  estimatedCostPaise: z.coerce.number().int().min(0).default(0),
  advancePaise: z.coerce.number().int().min(0).default(0),
  promisedAt: z.string().optional().nullable(),
  assignedTo: z.string().max(120).optional(),
  notes: z.string().max(500).optional(),
});

export async function GET() {
  return handleRoute(async () => {
    const { response } = await apiGuard();
    if (response) return response;
    const rows = await db
      .select({ repair: repairs, customerName: customers.name, mobile: customers.mobile })
      .from(repairs)
      .leftJoin(customers, eq(repairs.customerId, customers.id))
      .orderBy(desc(repairs.receivedAt))
      .limit(200);
    return jsonOk({ repairs: rows });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const { session, response } = await apiGuard("salesman");
    if (response) return response;
    const { data, error } = await readJson(request, repairSchema);
    if (error) return error;

    const jobNo = await nextDocumentNumber(db, "repair", "RPR");
    const [repair] = await db
      .insert(repairs)
      .values({
        jobNo,
        customerId: data.customerId ?? null,
        branchId: data.branchId ?? null,
        itemDescription: data.itemDescription,
        metalType: data.metalType,
        grossWeightMg: data.grossWeightMg,
        issue: data.issue,
        estimatedCostPaise: data.estimatedCostPaise,
        advancePaise: data.advancePaise,
        promisedAt: data.promisedAt ? new Date(data.promisedAt) : null,
        assignedTo: data.assignedTo,
        notes: data.notes,
      })
      .returning();

    await logActivity(session, "repair.created", "repair", repair.id, `${jobNo} · ${repair.itemDescription}`);
    return jsonOk({ repair }, 201);
  });
}
