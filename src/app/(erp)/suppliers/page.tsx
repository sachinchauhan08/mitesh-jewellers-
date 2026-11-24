import { asc, eq } from "drizzle-orm";
import { Truck } from "lucide-react";
import { db } from "@/lib/db";
import { purchases, suppliers } from "@/lib/db/schema";
import { canManage, requireSession } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { compactPaise, paise } from "@/lib/format";
import { PageHeader } from "@/components/erp/page-header";
import { StatCard } from "@/components/erp/stat-card";
import { AddSupplierDialog } from "@/components/erp/add-supplier-dialog";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Suppliers" };

export default async function SuppliersPage() {
  const session = await requireSession();
  if (!canManage(session.user.role) && session.user.role !== "accountant") {
    redirect("/dashboard");
  }

  const [rows, purchaseRows] = await Promise.all([
    db.select().from(suppliers).where(eq(suppliers.isActive, true)).orderBy(asc(suppliers.name)),
    db.select().from(purchases),
  ]);

  const spendMap = new Map<number, { total: number; due: number; bills: number }>();
  for (const purchase of purchaseRows) {
    if (!purchase.supplierId) continue;
    const current = spendMap.get(purchase.supplierId) ?? { total: 0, due: 0, bills: 0 };
    current.total += purchase.totalPaise;
    current.due += purchase.duePaise;
    current.bills += 1;
    spendMap.set(purchase.supplierId, current);
  }

  const totalDue = rows.reduce((sum, row) => sum + row.outstandingPaise, 0);
  const totalSpend = purchaseRows.reduce((sum, row) => sum + row.totalPaise, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Vendor book"
        title="Suppliers"
        description="Bullion dealers, karigars and trade partners, with balances and purchase history."
        actions={<AddSupplierDialog />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active suppliers" value={String(rows.length)} icon={Truck} />
        <StatCard label="Lifetime purchases" value={compactPaise(totalSpend)} tone="gold" />
        <StatCard label="Payable" value={compactPaise(totalDue)} tone="warning" />
        <StatCard
          label="Largest partner"
          value={
            rows.length
              ? rows.reduce((best, row) =>
                  (spendMap.get(row.id)?.total ?? 0) > (spendMap.get(best.id)?.total ?? 0) ? row : best,
                ).name
              : "—"
          }
        />
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-4 py-3 font-medium">Supplier</th>
                <th className="px-3 py-3 font-medium">Contact</th>
                <th className="px-3 py-3 font-medium">GSTIN</th>
                <th className="px-3 py-3 text-right font-medium">Bills</th>
                <th className="px-3 py-3 text-right font-medium">Purchases</th>
                <th className="px-4 py-3 text-right font-medium">Payable</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((supplier) => {
                const spend = spendMap.get(supplier.id);
                return (
                  <tr key={supplier.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <p className="font-medium">{supplier.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {supplier.code} · {supplier.city ?? "—"}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <p>{supplier.contactPerson ?? "—"}</p>
                      <p className="text-[11px] text-muted-foreground">{supplier.mobile ?? ""}</p>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{supplier.gstin ?? "—"}</td>
                    <td className="tabular px-3 py-3 text-right text-xs">{spend?.bills ?? 0}</td>
                    <td className="tabular px-3 py-3 text-right">{compactPaise(spend?.total ?? 0)}</td>
                    <td className={`tabular px-4 py-3 text-right ${supplier.outstandingPaise > 0 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
                      {paise(supplier.outstandingPaise)}
                    </td>
                  </tr>
                );
              })}
              {!rows.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center">
                    <p className="text-sm font-medium">No suppliers yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Add your bullion dealer or karigar to start recording purchases.
                    </p>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
