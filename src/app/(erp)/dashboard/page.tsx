import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  Coins,
  Gem,
  Landmark,
  Package,
  Plus,
  ReceiptText,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { requireSession } from "@/lib/auth-helpers";
import { getDashboardData } from "@/lib/queries/dashboard";
import { compactPaise, formatDateTime, grams, paise, weightValue } from "@/lib/format";
import { PageHeader, SectionHeading, StatusBadge } from "@/components/erp/page-header";
import { StatCard } from "@/components/erp/stat-card";
import { BranchFilter, RefreshButton } from "@/components/erp/filters";
import {
  MixDonut,
  PurchaseBarChart,
  RateSparkline,
  SalesAreaChart,
} from "@/components/erp/charts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata = { title: "Dashboard" };

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const branchId = params.branch ? Number(params.branch) : undefined;
  const data = await getDashboardData(branchId);
  const firstName = session.user.name.split(" ")[0];

  const last14 = data.series.reduce((sum, d) => sum + d.sales, 0);
  const previous7 = data.series.slice(0, 7).reduce((sum, d) => sum + d.sales, 0);
  const last7 = data.series.slice(7).reduce((sum, d) => sum + d.sales, 0);
  const trend = previous7 > 0 ? ((last7 - previous7) / previous7) * 100 : 0;
  const goldRate = data.rateGrid.find((r) => r.metal === "gold" && r.purity === "22K");
  const rateRows = [
    { label: "Gold 24K", ...data.rateGrid.find((r) => r.metal === "gold" && r.purity === "24K") },
    { label: "Gold 22K", ...data.rateGrid.find((r) => r.metal === "gold" && r.purity === "22K") },
    { label: "Gold 18K", ...data.rateGrid.find((r) => r.metal === "gold" && r.purity === "18K") },
    { label: "Silver 999", ...data.rateGrid.find((r) => r.metal === "silver") },
  ];

  return (
    <div>
      <PageHeader
        eyebrow={new Date().toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
        title={`${greeting()}, ${firstName}`}
        description={`${data.totals.invoiceCount} invoices billed at ${data.branches.length === 1 ? "the Babra showroom" : `${data.branches.length} showrooms`}. Live metal rates drive every price on the floor.`}
        actions={
          <>
            <BranchFilter branches={data.branches} />
            <RefreshButton />
            <Button asChild className="h-9">
              <Link href="/pos">
                <Plus className="mr-1.5 size-4" /> New sale
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total sales"
          value={compactPaise(data.totals.totalSales)}
          icon={TrendingUp}
          tone="gold"
          hint={
            <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
              <ArrowUpRight className="size-3.5" />
              {Math.abs(trend).toFixed(1)}% {trend >= 0 ? "up" : "down"} week on week
            </span>
          }
        />
        <StatCard
          label="Today's sales"
          value={paise(data.totals.todaySales)}
          icon={ReceiptText}
          hint={`${data.series.at(-1)?.invoices ?? 0} invoices today`}
        />
        <StatCard
          label="This month"
          value={compactPaise(data.totals.monthSales)}
          icon={Banknote}
          hint={`Purchases ${compactPaise(data.purchases.month)}`}
        />
        <StatCard
          label="Gross profit"
          value={compactPaise(data.grossProfit)}
          icon={Wallet}
          tone="positive"
          hint="Net of GST, at product cost"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-start justify-between gap-3 pb-2">
            <div>
              <CardTitle className="text-base">Sales analytics</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Last 14 days · {compactPaise(last14)} billed
              </p>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link href="/reports">Open reports <ArrowUpRight className="ml-1 size-3.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            <SalesAreaChart data={data.series} />
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Gold rate overview</CardTitle>
            <p className="text-xs text-muted-foreground">
              22K · updated {formatDateTime(goldRate?.effectiveFrom)}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="tabular font-display text-4xl">
                {paise(goldRate?.rate)}
              </span>
              <span className="text-xs text-muted-foreground">/ gram</span>
            </div>
            <RateSparkline data={data.rateHistory} />
            <Separator />
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              {rateRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="tabular font-medium">{paise(row.rate)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Stock value"
          value={compactPaise(data.stock.cost)}
          icon={Package}
          hint={`${data.stock.productCount} SKUs · retail ${compactPaise(data.stock.retail)}`}
        />
        <StatCard
          label="Gold stock"
          value={grams(data.stock.goldMg, 1)}
          icon={Gem}
          tone="gold"
          hint={`Silver ${grams(data.stock.silverMg, 1)} · Diamond ${weightValue(data.stock.diamondMg, 2)} g`}
        />
        <StatCard
          label="Cash in hand"
          value={compactPaise(data.cash.inHand)}
          icon={Banknote}
          hint={`Bank & digital ${compactPaise(data.cash.bank)}`}
        />
        <StatCard
          label="Outstanding"
          value={compactPaise(data.relationships.customerOutstanding)}
          icon={Landmark}
          tone="warning"
          hint={`Payable to suppliers ${compactPaise(data.relationships.supplierOutstanding)}`}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Recent transactions</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link href="/invoices">View all <ArrowUpRight className="ml-1 size-3.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-border text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    <th className="px-5 py-2.5 font-medium">Invoice</th>
                    <th className="px-3 py-2.5 font-medium">Customer</th>
                    <th className="px-3 py-2.5 font-medium">Showroom</th>
                    <th className="px-3 py-2.5 text-right font-medium">Amount</th>
                    <th className="px-5 py-2.5 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((row) => (
                    <tr key={row.id} className="border-b border-border/60 last:border-0">
                      <td className="px-5 py-3">
                        <Link href={`/invoices/${row.id}`} className="font-medium hover:underline">
                          {row.invoiceNo}
                        </Link>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDateTime(row.invoiceDate)}
                        </p>
                      </td>
                      <td className="px-3 py-3">{row.customer}</td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {row.branch ?? "—"}
                      </td>
                      <td className="tabular px-3 py-3 text-right">{paise(row.totalPaise)}</td>
                      <td className="px-5 py-3 text-right">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                  {!data.recent.length ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
                        No sales yet. Start a sale from the counter to see it here.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="size-4 text-amber-600" /> Low stock
              </CardTitle>
              <span className="text-xs text-muted-foreground">{data.stock.lowStockCount} alerts</span>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.lowStock.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{item.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {item.sku} · {item.purity} {item.metalType}
                    </p>
                  </div>
                  <span className="tabular shrink-0 text-xs font-medium text-amber-700 dark:text-amber-400">
                    {item.stockQty} left
                  </span>
                </div>
              ))}
              {!data.lowStock.length ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  Every SKU is above its reorder level.
                </p>
              ) : null}
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/inventory?low=1">Review inventory</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Best sellers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.topProducts.map((item, index) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium">
                    {index + 1}
                  </span>
                  <p className="min-w-0 flex-1 truncate text-sm">{item.name}</p>
                  <span className="tabular text-xs text-muted-foreground">
                    {compactPaise(item.value)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Purchase analytics</CardTitle>
            <p className="text-xs text-muted-foreground">Six-month buying trend</p>
          </CardHeader>
          <CardContent>
            <PurchaseBarChart data={data.purchaseSeries} />
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
              <span className="text-muted-foreground">Total purchases</span>
              <span className="tabular font-medium">{compactPaise(data.purchases.total)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Category mix</CardTitle>
            <p className="text-xs text-muted-foreground">Share of sales value</p>
          </CardHeader>
          <CardContent>
            <MixDonut data={data.categoryMix} totalLabel="Billed" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Collections</CardTitle>
            <p className="text-xs text-muted-foreground">Received by payment mode</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <MixDonut
              data={data.paymentMix.map((p) => ({
                name: p.mode.toUpperCase(),
                value: p.value,
              }))}
              totalLabel="Collected"
            />
            <Separator />
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground">Customers</p>
                <p className="tabular text-lg font-medium">{data.relationships.customers}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Suppliers</p>
                <p className="tabular text-lg font-medium">{data.relationships.suppliers}</p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/customers">
                <Users className="mr-2 size-3.5" /> Open customer book
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
        <Coins className="size-3.5 text-gold-deep" />
        Rates refresh with each authorised update. Selling prices always use the latest
        rate card.
      </div>
    </div>
  );
}
