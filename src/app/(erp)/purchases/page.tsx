import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  branches,
  products,
  purchases,
  suppliers,
} from "@/lib/db/schema";
import { canManage, requireSession } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { compactPaise, formatDate, paise } from "@/lib/format";
import { PageHeader, StatusBadge } from "@/components/erp/page-header";
import { StatCard } from "@/components/erp/stat-card";
import { PurchaseFormDialog } from "@/components/erp/purchase-form-dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Purchases" };

export default async function PurchasesPage() {
  const session = await requireSession();
  if (!canManage(session.user.role) && session.user.role !== "accountant") {
    redirect("/dashboard");
  }

  const [rows, supplierRows, productRows, branchRows] = await Promise.all([
    db
      .select({ purchase: purchases, supplierName: suppliers.name })
      .from(purchases)
      .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .orderBy(desc(purchases.purchaseDate))
      .limit(100),
    db
      .select({ id: suppliers.id, name: suppliers.name })
      .from(suppliers)
      .where(eq(suppliers.isActive, true))
      .orderBy(suppliers.name),
    db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        metalType: products.metalType,
        purity: products.purity,
      })
      .from(products)
      .orderBy(products.name)
      .limit(300),
    db.select({ id: branches.id, name: branches.name }).from(branches),
  ]);

  const total = rows.reduce((sum, row) => sum + row.purchase.totalPaise, 0);
  const paid = rows.reduce((sum, row) => sum + row.purchase.paidPaise, 0);
  const due = rows.reduce((sum, row) => sum + row.purchase.duePaise, 0);
  const rawGoldWeight = rows
    .filter((row) => row.purchase.type !== "finished")
    .reduce((sum, row) => sum + row.purchase.subtotalPaise, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Procurement"
        title="Purchases"
        description="Raw gold, finished jewellery and old-gold lots from suppliers, with balances and GST."
        actions={
          <PurchaseFormDialog
            suppliers={supplierRows}
            products={productRows}
            branches={branchRows}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total purchases" value={compactPaise(total)} hint={`${rows.length} bills`} />
        <StatCard label="Paid to suppliers" value={compactPaise(paid)} tone="positive" />
        <StatCard label="Supplier balance" value={compactPaise(due)} tone="warning" />
        <StatCard
          label="Metal purchases"
          value={compactPaise(rawGoldWeight)}
          tone="gold"
          hint="Raw gold and old-gold lots"
        />
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-4 py-3 font-medium">Purchase</th>
                <th className="px-3 py-3 font-medium">Supplier</th>
                <th className="px-3 py-3 font-medium">Type</th>
                <th className="px-3 py-3 text-right font-medium">Subtotal</th>
                <th className="px-3 py-3 text-right font-medium">GST</th>
                <th className="px-3 py-3 text-right font-medium">Total</th>
                <th className="px-3 py-3 text-right font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.purchase.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.purchase.purchaseNo}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDate(row.purchase.purchaseDate)}
                    </p>
                  </td>
                  <td className="px-3 py-3">{row.supplierName ?? "—"}</td>
                  <td className="px-3 py-3">
                    <Badge variant="outline" className="rounded-full text-[10px] capitalize">
                      {row.purchase.type.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="tabular px-3 py-3 text-right">{paise(row.purchase.subtotalPaise)}</td>
                  <td className="tabular px-3 py-3 text-right text-muted-foreground">
                    {paise(row.purchase.gstPaise)}
                  </td>
                  <td className="tabular px-3 py-3 text-right font-medium">
                    {paise(row.purchase.totalPaise)}
                  </td>
                  <td className={`tabular px-3 py-3 text-right ${row.purchase.duePaise > 0 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
                    {paise(row.purchase.duePaise)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.purchase.status} />
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center text-sm text-muted-foreground">
                    No purchases recorded yet. Add your first supplier bill to start
                    reconciliation.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">
        Metal weight reconciliation: raw-metal lines add weight against the supplier
        lot; finished lines add sellable stock. Customer old gold is captured in the
        Old Gold register.
      </p>
    </div>
  );
}
