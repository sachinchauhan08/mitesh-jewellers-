import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { branches, salesInvoices, staffProfiles } from "@/lib/db/schema";
import { user } from "@/lib/db/auth-schema";
import { canManage, requireSession } from "@/lib/auth-helpers";
import { compactPaise } from "@/lib/format";
import { PageHeader } from "@/components/erp/page-header";
import { StatCard } from "@/components/erp/stat-card";
import { StaffClient } from "@/components/erp/staff-client";

export const metadata = { title: "Staff" };

export default async function StaffPage() {
  const session = await requireSession();
  if (!canManage(session.user.role)) redirect("/dashboard");

  const [rows, branchRows, salesRows] = await Promise.all([
    db
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
      .orderBy(asc(user.name)),
    db.select({ id: branches.id, name: branches.name }).from(branches),
    db
      .select({ createdBy: salesInvoices.createdBy, total: salesInvoices.totalPaise })
      .from(salesInvoices),
  ]);

  const salesMap = new Map<string, number>();
  for (const row of salesRows) {
    if (!row.createdBy) continue;
    salesMap.set(row.createdBy, (salesMap.get(row.createdBy) ?? 0) + row.total);
  }

  const active = rows.filter((row) => row.isActive !== false);
  const targetTotal = rows.reduce((sum, row) => sum + (row.salesTargetPaise ?? 0), 0);
  const achieved = rows.reduce((sum, row) => sum + (salesMap.get(row.userId) ?? 0), 0);
  const commissionLiability = rows.reduce(
    (sum, row) => sum + Math.round(((salesMap.get(row.userId) ?? 0) * (row.commissionBp ?? 0)) / 10000),
    0,
  );

  return (
    <div>
      <PageHeader
        eyebrow="Team"
        title="Staff & salesmen"
        description="Roles, branch postings, sales targets and commission earned by the team."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Team members" value={String(active.length)} hint={`${rows.length} total logins`} />
        <StatCard label="Target set" value={compactPaise(targetTotal)} />
        <StatCard
          label="Achieved"
          value={compactPaise(achieved)}
          tone="positive"
          hint={targetTotal ? `${Math.round((achieved / targetTotal) * 100)}% of target` : undefined}
        />
        <StatCard label="Commission earned" value={compactPaise(commissionLiability)} tone="gold" />
      </div>

      <StaffClient
        staff={rows.map((row) => ({
          userId: row.userId,
          name: row.name,
          email: row.email,
          role: row.role,
          phone: row.phone,
          designation: row.designation,
          branchId: row.branchId,
          commissionBp: row.commissionBp ?? 0,
          salesTargetPaise: row.salesTargetPaise ?? 0,
          joinedAt: row.joinedAt,
          isActive: row.isActive ?? true,
          salesPaise: salesMap.get(row.userId) ?? 0,
          isSelf: row.userId === session.user.id,
        }))}
        branches={branchRows}
        canCreate={session.user.role === "admin"}
      />
    </div>
  );
}
