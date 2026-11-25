import { and, desc, eq, gte, lte, ne, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  categories,
  customers,
  products,
  purchases,
  salesInvoices,
  salesItems,
} from "@/lib/db/schema";
import { canManage, requireSession } from "@/lib/auth-helpers";
import { compactPaise, formatDate, grams, paise } from "@/lib/format";
import { PageHeader } from "@/components/erp/page-header";
import { StatCard } from "@/components/erp/stat-card";
import { SalesAreaChart, MixDonut } from "@/components/erp/charts";
import { ReportExport } from "@/components/erp/report-export";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Reports" };

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await requireSession();
  if (!canManage(session.user.role) && session.user.role !== "accountant") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const to = params.to ? new Date(`${params.to}T23:59:59`) : new Date();
  const from = params.from
    ? new Date(`${params.from}T00:00:00`)
    : new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);

  const [invoiceRows, itemRows, purchaseRows, outstanding, categoryRows] = await Promise.all([
    db
      .select()
      .from(salesInvoices)
      .where(
        and(
          gte(salesInvoices.invoiceDate, from),
          lte(salesInvoices.invoiceDate, to),
          ne(salesInvoices.status, "cancelled"),
        ),
      )
      .orderBy(desc(salesInvoices.invoiceDate)),
    db
      .select({
        productId: salesItems.productId,
        name: products.name,
        qty: salesItems.qty,
        weightMg: salesItems.netWeightMg,
        totalPaise: salesItems.totalPaise,
      })
      .from(salesItems)
      .innerJoin(salesInvoices, eq(salesItems.invoiceId, salesInvoices.id))
      .innerJoin(products, eq(salesItems.productId, products.id))
      .where(
        and(
          gte(salesInvoices.invoiceDate, from),
          lte(salesInvoices.invoiceDate, to),
          ne(salesInvoices.status, "cancelled"),
        ),
      ),
    db
      .select()
      .from(purchases)
      .where(and(gte(purchases.purchaseDate, from), lte(purchases.purchaseDate, to))),
    db
      .select({
        outstanding: sql<string>`coalesce(sum(${customers.outstandingPaise}), 0)`,
        advance: sql<string>`coalesce(sum(${customers.advancePaise}), 0)`,
      })
      .from(customers),
    db
      .select({
        name: categories.name,
        total: sql<string>`coalesce(sum(${salesItems.totalPaise}), 0)`,
      })
      .from(salesItems)
      .innerJoin(salesInvoices, eq(salesItems.invoiceId, salesInvoices.id))
      .innerJoin(products, eq(salesItems.productId, products.id))
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(
        and(
          gte(salesInvoices.invoiceDate, from),
          lte(salesInvoices.invoiceDate, to),
          ne(salesInvoices.status, "cancelled"),
        ),
      )
      .groupBy(categories.name)
      .orderBy(desc(sql`coalesce(sum(${salesItems.totalPaise}), 0)`))
      .limit(6),
  ]);

  const salesTotal = invoiceRows.reduce((sum, row) => sum + row.totalPaise, 0);
  const gstCollected = invoiceRows.reduce((sum, row) => sum + row.gstPaise, 0);
  const discountTotal = invoiceRows.reduce((sum, row) => sum + row.discountPaise, 0);
  const oldGoldTotal = invoiceRows.reduce((sum, row) => sum + row.oldGoldValuePaise, 0);
  const purchaseTotal = purchaseRows.reduce((sum, row) => sum + row.totalPaise, 0);
  const purchaseGst = purchaseRows.reduce((sum, row) => sum + row.gstPaise, 0);

  const dayMap = new Map<string, { sales: number; invoices: number }>();
  for (const invoice of invoiceRows) {
    const key = isoDate(invoice.invoiceDate);
    const current = dayMap.get(key) ?? { sales: 0, invoices: 0 };
    current.sales += invoice.totalPaise;
    current.invoices += 1;
    dayMap.set(key, current);
  }
  const series = [...dayMap.entries()]
    .map(([day, value]) => ({ day, ...value }))
    .sort((a, b) => a.day.localeCompare(b.day));

  const productMap = new Map<number, { name: string; qty: number; weightMg: number; total: number }>();
  for (const item of itemRows) {
    if (item.productId == null) continue;
    const current = productMap.get(item.productId) ?? {
      name: item.name,
      qty: 0,
      weightMg: 0,
      total: 0,
    };
    current.qty += item.qty;
    current.weightMg += item.weightMg;
    current.total += item.totalPaise;
    productMap.set(item.productId, current);
  }
  const topProducts = [...productMap.values()].sort((a, b) => b.total - a.total).slice(0, 8);

  const mix = categoryRows.map((row) => ({ name: row.name, value: Number(row.total) }));
  const balance = outstanding[0];

  const exportRows = invoiceRows.map((row) => ({
    Invoice: row.invoiceNo,
    Date: formatDate(row.invoiceDate),
    Channel: row.channel,
    Subtotal: row.subtotalPaise / 100,
    GST: row.gstPaise / 100,
    Discount: row.discountPaise / 100,
    "Old gold": row.oldGoldValuePaise / 100,
    Total: row.totalPaise / 100,
    Status: row.status,
  }));

  return (
    <div>
      <PageHeader
        eyebrow="Business intelligence"
        title="Reports"
        description="Sales, purchases, GST and receivables for the selected period."
        actions={<ReportExport rows={exportRows} filename={`mitesh-sales-${isoDate(from)}-${isoDate(to)}`} />}
      />

      <Card className="mb-4 p-3">
        <form className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <label htmlFor="from" className="text-[11px] font-medium text-muted-foreground">
              From
            </label>
            <Input id="from" name="from" type="date" defaultValue={isoDate(from)} className="h-9 w-[150px]" />
          </div>
          <div className="space-y-1">
            <label htmlFor="to" className="text-[11px] font-medium text-muted-foreground">
              To
            </label>
            <Input id="to" name="to" type="date" defaultValue={isoDate(to)} className="h-9 w-[150px]" />
          </div>
          <Button type="submit" variant="secondary" className="h-9">
            Apply
          </Button>
          <span className="ml-auto text-[11px] text-muted-foreground">
            {invoiceRows.length} invoices · {purchaseRows.length} purchase bills
          </span>
        </form>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Sales" value={compactPaise(salesTotal)} hint={`${invoiceRows.length} invoices`} tone="gold" />
        <StatCard label="Purchases" value={compactPaise(purchaseTotal)} hint={`${purchaseRows.length} bills`} />
        <StatCard label="GST payable" value={compactPaise(gstCollected - purchaseGst)} hint="Output less input tax" tone="warning" />
        <StatCard label="Receivables" value={compactPaise(Number(balance?.outstanding ?? 0))} tone="positive" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-4">
          <h2 className="text-sm font-semibold">Daily sales</h2>
          <p className="text-[11px] text-muted-foreground">Net invoice value by day</p>
          <div className="mt-3">
            <SalesAreaChart data={series} />
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="text-sm font-semibold">Category mix</h2>
          <p className="text-[11px] text-muted-foreground">Share of sales value</p>
          <div className="mt-3">
            <MixDonut data={mix} totalLabel="Sales" />
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Top products</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Product</th>
                <th className="px-3 py-2.5 text-right font-medium">Qty</th>
                <th className="px-3 py-2.5 text-right font-medium">Weight</th>
                <th className="px-4 py-2.5 text-right font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((product) => (
                <tr key={product.name} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-2.5 text-xs">{product.name}</td>
                  <td className="tabular px-3 py-2.5 text-right text-xs">{product.qty}</td>
                  <td className="tabular px-3 py-2.5 text-right text-xs">{grams(product.weightMg)}</td>
                  <td className="tabular px-4 py-2.5 text-right text-xs font-medium">{paise(product.total)}</td>
                </tr>
              ))}
              {!topProducts.length ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-xs text-muted-foreground">
                    No sales in this period.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-semibold">GST &amp; settlement summary</h2>
          <dl className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Output GST (sales)</dt>
              <dd className="tabular font-medium">{paise(gstCollected)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Input GST (purchases)</dt>
              <dd className="tabular">{paise(purchaseGst)}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-border pt-2">
              <dt className="font-medium">Net GST payable</dt>
              <dd className="tabular font-semibold text-gold-deep">{paise(gstCollected - purchaseGst)}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-border pt-2">
              <dt className="text-muted-foreground">Discounts given</dt>
              <dd className="tabular">{paise(discountTotal)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Old gold adjusted</dt>
              <dd className="tabular">{paise(oldGoldTotal)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Customer advances held</dt>
              <dd className="tabular">{paise(Number(balance?.advance ?? 0))}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Average bill</dt>
              <dd className="tabular">
                {paise(invoiceRows.length ? Math.round(salesTotal / invoiceRows.length) : 0)}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <p className="mt-4 text-[11px] text-muted-foreground">
        Period {formatDate(from)} to {formatDate(to)}. Figures are computed from posted invoices and
        purchase bills; cancelled invoices are excluded.
      </p>
    </div>
  );
}
