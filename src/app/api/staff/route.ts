import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { staffProfiles } from "@/lib/db/schema";
import { user } from "@/lib/db/auth-schema";
import { auth } from "@/lib/auth";
import { apiGuard, handleRoute, jsonOk, logActivity, readJson } from "@/lib/api-utils";

const staffSchema = z.object({
  name: z.string().min(2, "Enter the staff member's full name.").max(120),
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  phone: z.string().max(20).optional(),
  role: z.enum(["admin", "manager", "cashier", "salesman", "accountant"]).default("salesman"),
  designation: z.string().max(80).optional(),
  branchId: z.coerce.number().int().positive().optional().nullable(),
  joinedAt: z.string().optional().nullable(),
  commissionBp: z.coerce.number().int().min(0).max(10000).default(0),
  salesTargetPaise: z.coerce.number().int().min(0).default(0),
});

export async function GET() {
  return handleRoute(async () => {
    const { response } = await apiGuard("manager");
    if (response) return response;
    const rows = await db
      .select({
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        designation: user.designation,
        createdAt: user.createdAt,
        profileId: staffProfiles.id,
        branchId: staffProfiles.branchId,
        commissionBp: staffProfiles.commissionBp,
        salesTargetPaise: staffProfiles.salesTargetPaise,
        joinedAt: staffProfiles.joinedAt,
        isActive: staffProfiles.isActive,
      })
      .from(user)
      .leftJoin(staffProfiles, eq(staffProfiles.userId, user.id))
      .orderBy(asc(user.name));
    return jsonOk({ staff: rows });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const { session, response } = await apiGuard("admin");
    if (response) return response;
    const { data, error } = await readJson(request, staffSchema);
    if (error) return error;

    const email = data.email.toLowerCase().trim();
    const existing = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
    if (existing.length) {
      return jsonOk({ error: "A user with this email already exists." }, 409);
    }

    const created = await auth.api.signUpEmail({
      body: {
        name: data.name,
        email,
        password: data.password,
        phone: data.phone,
        designation: data.designation,
      },
    });

    await db
      .update(user)
      .set({ role: data.role, phone: data.phone ?? null, designation: data.designation ?? null })
      .where(eq(user.id, created.user.id));

    const [profile] = await db
      .insert(staffProfiles)
      .values({
        userId: created.user.id,
        branchId: data.branchId ?? null,
        designation: data.designation,
        phone: data.phone,
        joinedAt: data.joinedAt || null,
        commissionBp: data.commissionBp,
        salesTargetPaise: data.salesTargetPaise,
      })
      .returning();

    await logActivity(session, "staff.created", "user", created.user.id, `${data.name} · ${data.role}`);
    return jsonOk({ profile }, 201);
  });
}
