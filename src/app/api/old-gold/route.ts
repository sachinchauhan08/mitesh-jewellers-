import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { customers, oldGoldPurchases } from "@/lib/db/schema";
import { apiGuard, handleRoute, jsonOk, logActivity, readJson } from "@/lib/api-utils";
import { nextDocumentNumber } from "@/lib/documents";
import { estimateOldGold } from "@/lib/pricing";
import { getLatestRates, rateFor } from "@/lib/rates";

const oldGoldSchema = z.object({
  customerId: z.coerce.number().int().positive().optional().nullable(),
  branchId: z.coerce.number().int().positive().optional().nullable(),
  grossWeightMg: z.coerce.number().int().positive("Enter the gross weight in grams."),
  purityBp: z.coerce.number().int().min(1).max(10000).default(9160),
  meltingLossBp: z.coerce.number().int().min(0).max(5000).default(0),
  ratePerGramPaise: z.coerce.number().int().positive().optional(),
  deductionBp: z.coerce.number().int().min(0).max(10000).default(0),
  settlementType: z.enum(["cash", "exchange", "bank"]).default("cash"),
  invoiceId: z.coerce.number().int().positive().optional().nullable(),
  notes: z.string().max(500).optional(),
});

export async function GET() {
  return handleRoute(async () => {
    const { response } = await apiGuard();
    if (response) return response;
    const rows = await db
      .select({ purchase: oldGoldPurchases, customerName: customers.name })
      .from(oldGoldPurchases)
      .leftJoin(customers, eq(oldGoldPurchases.customerId, customers.id))
      .orderBy(desc(oldGoldPurchases.date))
      .limit(200);
    return jsonOk({ purchases: rows });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const { session, response } = await apiGuard("cashier");
    if (response) return response;
    const { data, error } = await readJson(request, oldGoldSchema);
    if (error) return error;

    let ratePerGramPaise = data.ratePerGramPaise ?? 0;
    if (!ratePerGramPaise) {
      const rates = await getLatestRates();
      ratePerGramPaise =
        rateFor(rates, "gold", "22K")?.ratePerGramPaise ??
        rateFor(rates, "gold", "24K")?.ratePerGramPaise ??
        0;
    }
    if (!ratePerGramPaise) {
      return jsonOk({ error: "No authorised gold rate is available. Update metal rates first." }, 422);
    }

    const estimate = estimateOldGold({
      grossWeightMg: data.grossWeightMg,
      purityBp: data.purityBp,
      meltingLossBp: data.meltingLossBp,
      ratePerGramPaise,
      deductionBp: data.deductionBp,
    });

    const receiptNo = await nextDocumentNumber(db, "old_gold", "OG");
    const [purchase] = await db
      .insert(oldGoldPurchases)
      .values({
        receiptNo,
        customerId: data.customerId ?? null,
        branchId: data.branchId ?? null,
        grossWeightMg: data.grossWeightMg,
        purityBp: data.purityBp,
        meltingLossBp: data.meltingLossBp,
        netWeightMg: estimate.netWeightMg,
        ratePerGramPaise,
        deductionBp: data.deductionBp,
        finalValuePaise: estimate.finalValuePaise,
        settlementType: data.settlementType,
        invoiceId: data.invoiceId ?? null,
        notes: data.notes,
        createdBy: session.user.id,
      })
      .returning();

    await logActivity(
      session,
      "old_gold.created",
      "old_gold",
      purchase.id,
      `${receiptNo} · ${(data.grossWeightMg / 1000).toFixed(3)}g`,
    );
    return jsonOk({ purchase }, 201);
  });
}
