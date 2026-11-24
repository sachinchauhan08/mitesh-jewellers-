import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession, type AppRole, type AppSession } from "./auth-helpers";
import { db } from "./db";
import { activityLogs } from "./db/schema";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

type GuardResult =
  | { session: AppSession; response: null }
  | { session: null; response: NextResponse };

const RANK: Record<string, number> = {
  admin: 5,
  manager: 4,
  accountant: 3,
  cashier: 2,
  salesman: 1,
};

export async function apiGuard(minRole?: AppRole): Promise<GuardResult> {
  const session = await requireApiSession();
  if (!session) {
    return { session: null, response: jsonError("Please sign in to continue.", 401) };
  }
  if (minRole && (RANK[session.user.role] ?? 0) < (RANK[minRole] ?? 99)) {
    return {
      session: null,
      response: jsonError("You do not have permission for this action.", 403),
    };
  }
  return { session, response: null };
}

export async function readJson<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { data: null, error: jsonError("Send a valid JSON body.") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      data: null,
      error: jsonError(first?.message ?? "Check the submitted values.", 422),
    };
  }
  return { data: parsed.data, error: null };
}

export async function logActivity(
  session: AppSession,
  action: string,
  entity: string,
  entityId?: string | number | null,
  detail?: string,
) {
  await db.insert(activityLogs).values({
    userId: session.user.id,
    userName: session.user.name,
    action,
    entity,
    entityId: entityId != null ? String(entityId) : null,
    detail,
  });
}

export function toNumber(value: unknown): number {
  if (value == null) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function handleRoute(
  fn: () => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    return await fn();
  } catch (error) {
    console.error("[api]", error);
    const message =
      error instanceof Error && error.message.includes("duplicate key")
        ? "A record with these details already exists."
        : "Something went wrong on our side. Please try again.";
    return jsonError(message, 500);
  }
}
