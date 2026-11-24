import { and, asc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { suppliers } from "@/lib/db/schema";
import { apiGuard, handleRoute, jsonOk, logActivity, readJson } from "@/lib/api-utils";
import { nextDocumentNumber } from "@/lib/documents";

const supplierSchema = z.object({
  name: z.string().min(2).max(160),
  contactPerson: z.string().max(120).optional(),
  mobile: z.string().max(15).optional(),
  email: z.string().email().optional().or(z.literal("")),
  gstin: z.string().max(20).optional(),
  address: z.string().max(400).optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(80).optional(),
});

export async function GET(request: Request) {
  return handleRoute(async () => {
    const { response } = await apiGuard();
    if (response) return response;
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim();
    const rows = await db
      .select()
      .from(suppliers)
      .where(
        q
          ? or(ilike(suppliers.name, `%${q}%`), ilike(suppliers.mobile, `%${q}%`))
          : and(eq(suppliers.isActive, true)),
      )
      .orderBy(asc(suppliers.name))
      .limit(200);
    return jsonOk({ suppliers: rows });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const { session, response } = await apiGuard("manager");
    if (response) return response;
    const { data, error } = await readJson(request, supplierSchema);
    if (error) return error;

    const code = await nextDocumentNumber(db, "supplier", "SUP");
    const [supplier] = await db
      .insert(suppliers)
      .values({
        code,
        name: data.name,
        contactPerson: data.contactPerson,
        mobile: data.mobile,
        email: data.email || null,
        gstin: data.gstin,
        address: data.address,
        city: data.city,
        state: data.state,
      })
      .returning();
    await logActivity(session, "supplier.created", "supplier", supplier.id, supplier.name);
    return jsonOk({ supplier }, 201);
  });
}
