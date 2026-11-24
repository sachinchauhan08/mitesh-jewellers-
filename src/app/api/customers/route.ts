import { and, asc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { apiGuard, handleRoute, jsonOk, logActivity, readJson } from "@/lib/api-utils";
import { nextDocumentNumber } from "@/lib/documents";

const customerSchema = z.object({
  name: z.string().min(2, "Enter the customer's full name.").max(160),
  mobile: z
    .string()
    .regex(/^[0-9]{10}$/, "Enter a valid 10-digit mobile number."),
  email: z.string().email("Enter a valid email address.").optional().or(z.literal("")),
  address: z.string().max(400).optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(80).optional(),
  pincode: z.string().max(10).optional(),
  dateOfBirth: z.string().optional(),
  anniversary: z.string().optional(),
  gender: z.string().max(16).optional(),
  preferences: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
});

export async function GET(request: Request) {
  return handleRoute(async () => {
    const { response } = await apiGuard();
    if (response) return response;
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim();
    const rows = await db
      .select()
      .from(customers)
      .where(
        q
          ? or(ilike(customers.name, `%${q}%`), ilike(customers.mobile, `%${q}%`))
          : and(eq(customers.isActive, true)),
      )
      .orderBy(asc(customers.name))
      .limit(200);
    return jsonOk({ customers: rows });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const { session, response } = await apiGuard("salesman");
    if (response) return response;

    const { data, error } = await readJson(request, customerSchema);
    if (error) return error;

    const code = await nextDocumentNumber(db, "customer", "CUS");
    const [customer] = await db
      .insert(customers)
      .values({
        code,
        name: data.name,
        mobile: data.mobile,
        email: data.email || null,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        dateOfBirth: data.dateOfBirth || null,
        anniversary: data.anniversary || null,
        gender: data.gender,
        preferences: data.preferences,
        notes: data.notes,
      })
      .onConflictDoUpdate({
        target: customers.mobile,
        set: {
          name: data.name,
          email: data.email || null,
          address: data.address,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
        },
      })
      .returning();

    await logActivity(session, "customer.saved", "customer", customer.id, customer.name);
    return jsonOk({ customer }, 201);
  });
}
