import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { branches, customers, oldGoldPurchases } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth-helpers";
import { getLatestRates } from "@/lib/rates";
import { compactPaise, grams, paise } from "@/lib/format";
import { PageHeader } from "@/components/erp/page-header";
import { StatCard } from "@/components/erp/stat-card";
import { OldGoldClient } from "@/components/erp/old-gold-client";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Old gold" };

export default async function OldGoldPage() {
  await requireSession();

  const [rows, customerRows, branchRows, rates] = await Promise.all([
    db
      .select({ purchase: oldGoldPurchases, customerName: customers.name })
      .from(oldGoldPurchases)
      .leftJoin(customers, eq(oldGoldPurchases.customerId, customers.id))
      .orderBy(desc(oldGoldPurchases.date))
      .limit(100),
    db
      .select({ id: customers.id, name: customers.name, mobile: customers.mobile })
      .from(customers)
      .where(eq(customers.isActive, true))
      .orderBy(customers.name)
      .limit(500),
    db.select({ id: branches.id, name: branches.name }).from(branches),
    getLatestRates(),
  ]);

  const goldRate22 = rates.find((r) => r.metal === "gold" && r.purity === "22K");
  const goldRate24 = rates.find((r) => r.metal === "gold" && r.purity === "24K");

  const totalValue = rows.reduce((sum, row) => sum + row.purchase.finalValuePaise, 0);
  const totalWeight = rows.reduce((sum, row) => sum + row.purchase.netWeightMg, 0);
  const cashSettled = rows
    .filter((row) => row.purchase.settlementType === "cash")
    .reduce((sum, row) => sum + row.purchase.finalValuePaise, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Gold buy-back"
        title="Old gold"
        description="Value customer gold by purity and melting loss, then settle in cash, bank or against a new purchase."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Receipts" value={String(rows.length)} hint="Last 100 shown" />
        <StatCard label="Net weight bought" value={grams(totalWeight)} tone="gold" />
        <StatCard label="Value paid" value={compactPaise(totalValue)} />
        <StatCard label="Cash settled" value={compactPaise(cashSettled)} tone="positive" />
      </div>

      <OldGoldClient
        rows={rows.map((row) => ({
          id: row.purchase.id,
          receiptNo: row.purchase.receiptNo,
          customerName: row.customerName,
          grossWeightMg: row.purchase.grossWeightMg,
          netWeightMg: row.purchase.netWeightMg,
          purityBp: row.purchase.purityBp,
          ratePerGramPaise: row.purchase.ratePerGramPaise,
          finalValuePaise: row.purchase.finalValuePaise,
          settlementType: row.purchase.settlementType,
          date: row.purchase.date.toISOString(),
        }))}
        customers={customerRows}
        branches={branchRows}
        goldRate22={goldRate22?.ratePerGramPaise ?? 0}
        goldRate24={goldRate24?.ratePerGramPaise ?? 0}
      />

      <Card className="mt-4 p-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">How valuation works</p>
        <p className="mt-1">
          Net weight = gross weight × purity factor, less melting loss. The final payout applies
          your deduction (making recovery or handling) to the metal value at the authorised rate.
          Nothing is rounded silently — every step is stored on the receipt.
        </p>
        <p className="mt-2">
          Latest 22K rate: <span className="tabular text-foreground">{paise(goldRate22?.ratePerGramPaise ?? 0)}/g</span>
          {" · "}
          24K rate: <span className="tabular text-foreground">{paise(goldRate24?.ratePerGramPaise ?? 0)}/g</span>
        </p>
      </Card>
    </div>
  );
}
