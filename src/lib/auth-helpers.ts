import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { roleAtLeast } from "./roles";

export type AppRole = "admin" | "manager" | "cashier" | "salesman" | "accountant";

export type AppSession = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    phone?: string | null;
    designation?: string | null;
    image?: string | null;
  };
};

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireSession(): Promise<AppSession> {
  const session = await getSession();
  if (!session?.user) redirect("/auth/sign-in");
  return session as unknown as AppSession;
}

export async function requireApiSession(): Promise<AppSession | null> {
  const session = await getSession();
  if (!session?.user) return null;
  return session as unknown as AppSession;
}

export function isAtLeast(role: string, min: AppRole): boolean {
  return roleAtLeast(role, min);
}

export function canManage(role: string): boolean {
  return isAtLeast(role, "manager");
}

export { ROLE_LABELS } from "./roles";
