import { asc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { branches } from "@/lib/db/schema";
import { apiGuard, handleRoute, jsonOk, logActivity, readJson } from "@/lib/api-utils";

const branchSchema = z.object({
  name: z.string().min(2, "Enter the showroom name.").max(120),
  code: z.string().min(2, "Enter a short branch code.").max(20),
  address: z.string().max(400).optional(),
  city: z.string().max(80).optional(),
  phone: z.string().max(30).optional(),
  gstin: z.string().max(20).optional(),
});

export async function GET() {
  return handleRoute(async () => {
    const { response } = await apiGuard();
    if (response) return response;
    const rows = await db.select().from(branches).orderBy(asc(branches.name));
    return jsonOk({ branches: rows });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const { session, response } = await apiGuard("admin");
    if (response) return response;
    const { data, error } = await readJson(request, branchSchema);
    if (error) return error;

    const code = data.code.toUpperCase().trim();
    const [branch] = await db
      .insert(branches)
      .values({
        name: data.name,
        code,
        address: data.address,
        city: data.city,
        phone: data.phone,
        gstin: data.gstin,
      })
      .onConflictDoUpdate({
        target: branches.code,
        set: { name: data.name, address: data.address, city: data.city, phone: data.phone },
      })
      .returning();

    await logActivity(session, "branch.saved", "branch", branch.id, branch.name);
    return jsonOk({ branch }, 201);
  });
}
