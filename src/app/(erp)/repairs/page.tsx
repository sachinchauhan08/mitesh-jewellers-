import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { branches, customers, repairs } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth-helpers";
import { compactPaise, grams } from "@/lib/format";
import { PageHeader } from "@/components/erp/page-header";
import { StatCard } from "@/components/erp/stat-card";
import { RepairsClient } from "@/components/erp/repairs-client";

export const metadata = { title: "Repairs" };

export default async function RepairsPage() {
  await requireSession();

  const [rows, customerRows, branchRows] = await Promise.all([
    db
      .select({ repair: repairs, customerName: customers.name, mobile: customers.mobile })
      .from(repairs)
      .leftJoin(customers, eq(repairs.customerId, customers.id))
      .orderBy(desc(repairs.receivedAt))
      .limit(200),
    db
      .select({ id: customers.id, name: customers.name, mobile: customers.mobile })
      .from(customers)
      .where(eq(customers.isActive, true))
      .orderBy(customers.name)
      .limit(500),
    db.select({ id: branches.id, name: branches.name }).from(branches),
  ]);

  const open = rows.filter((r) => ["received", "in_progress"].includes(r.repair.status));
  const ready = rows.filter((r) => r.repair.status === "ready");
  const revenue = rows
    .filter((r) => r.repair.status === "delivered")
    .reduce((sum, r) => sum + r.repair.estimatedCostPaise, 0);
  const pendingValue = open.reduce((sum, r) => sum + r.repair.estimatedCostPaise, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Service desk"
        title="Repairs"
        description="Log repair jobs, track the workshop flow and keep customers updated on pickup."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="In workshop" value={String(open.length)} hint="Received or in progress" />
        <StatCard label="Ready for pickup" value={String(ready.length)} tone="gold" />
        <StatCard label="Delivered value" value={compactPaise(revenue)} tone="positive" />
        <StatCard label="Pending estimate" value={compactPaise(pendingValue)} tone="warning" />
      </div>

      <RepairsClient
        rows={rows.map((row) => ({
          id: row.repair.id,
          jobNo: row.repair.jobNo,
          customerName: row.customerName,
          mobile: row.mobile,
          itemDescription: row.repair.itemDescription,
          metalType: row.repair.metalType,
          grossWeightMg: row.repair.grossWeightMg,
          estimatedCostPaise: row.repair.estimatedCostPaise,
          advancePaise: row.repair.advancePaise,
          status: row.repair.status,
          receivedAt: row.repair.receivedAt.toISOString(),
          promisedAt: row.repair.promisedAt?.toISOString() ?? null,
          assignedTo: row.repair.assignedTo,
        }))}
        customers={customerRows}
        branches={branchRows}
      />

      <p className="mt-3 text-xs text-muted-foreground">
        Total metal held in the workshop:{" "}
        <span className="tabular text-foreground">
          {grams(open.reduce((sum, r) => sum + r.repair.grossWeightMg, 0))}
        </span>
      </p>
    </div>
  );
}
