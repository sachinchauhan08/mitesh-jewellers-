import { asc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { branches, settings } from "@/lib/db/schema";
import { apiGuard, handleRoute, jsonOk, logActivity, readJson } from "@/lib/api-utils";

const settingsSchema = z.object({
  company_name: z.string().min(2).max(160),
  company_address: z.string().max(400),
  company_gstin: z.string().max(20),
  company_phone: z.string().max(30),
  company_email: z.string().email().or(z.literal("")),
  gst_rate_bp: z.coerce.number().int().min(0).max(2800),
  weight_precision: z.coerce.number().int().min(0).max(3),
  loyalty_rate_bp: z.coerce.number().int().min(0).max(10000),
  invoice_footer: z.string().max(400),
});

export async function GET() {
  return handleRoute(async () => {
    const { response } = await apiGuard();
    if (response) return response;
    const [rows, branchRows] = await Promise.all([
      db.select().from(settings),
      db.select().from(branches).orderBy(asc(branches.name)),
    ]);
    return jsonOk({
      settings: Object.fromEntries(rows.map((row) => [row.key, row.value])),
      branches: branchRows,
    });
  });
}

export async function PUT(request: Request) {
  return handleRoute(async () => {
    const { session, response } = await apiGuard("admin");
    if (response) return response;
    const { data, error } = await readJson(request, settingsSchema);
    if (error) return error;

    const entries = Object.entries(data).map(([key, value]) => ({
      key,
      value: String(value),
      updatedAt: new Date(),
    }));

    for (const entry of entries) {
      await db
        .insert(settings)
        .values(entry)
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: entry.value, updatedAt: entry.updatedAt },
        });
    }

    await logActivity(session, "settings.updated", "settings", null, "Company settings saved");
    return jsonOk({ ok: true });
  });
}
