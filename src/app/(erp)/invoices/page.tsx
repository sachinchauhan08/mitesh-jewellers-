import Link from "next/link";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { ArrowUpRight, Search } from "lucide-react";
import { db } from "@/lib/db";
import { branches, customers, salesInvoices } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth-helpers";
import { compactPaise, formatDateTime, paise } from "@/lib/format";
import { PageHeader, StatusBadge } from "@/components/erp/page-header";
import { StatCard } from "@/components/erp/stat-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Invoices" };

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; branch?: string }>;
}) {
  await requireSession();
  const params = await searchParams;
  const q = params.q?.trim();
  const status = params.status ?? "all";
  const branchId = params.branch ?? "all";

  const filters = [
    q
      ? or(
          ilike(salesInvoices.invoiceNo, `%${q}%`),
          ilike(customers.name, `%${q}%`),
          ilike(customers.mobile, `%${q}%`),
        )
      : undefined,
    status !== "all" ? eq(salesInvoices.status, status as "paid") : undefined,
    branchId !== "all" ? eq(salesInvoices.branchId, Number(branchId)) : undefined,
  ].filter(Boolean);

  const [rows, branchRows] = await Promise.all([
    db
      .select({
        invoice: salesInvoices,
        customerName: customers.name,
        customerMobile: customers.mobile,
        branchName: branches.name,
      })
      .from(salesInvoices)
      .leftJoin(customers, eq(salesInvoices.customerId, customers.id))
      .leftJoin(branches, eq(salesInvoices.branchId, branches.id))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(salesInvoices.invoiceDate), desc(salesInvoices.id))
      .limit(100),
    db.select({ id: branches.id, name: branches.name }).from(branches),
  ]);

  const billed = rows
    .filter((row) => row.invoice.status !== "cancelled")
    .reduce((sum, row) => sum + row.invoice.totalPaise, 0);
  const collected = rows.reduce((sum, row) => sum + row.invoice.paidPaise, 0);
  const due = rows.reduce((sum, row) => sum + row.invoice.duePaise, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Sales"
        title="Invoices"
        description="Every counter and online sale, with payment status, exchange adjustments and print-ready tax invoices."
        actions={
          <Button asChild className="h-9">
            <Link href="/pos">New sale <ArrowUpRight className="ml-1.5 size-4" /></Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Billed" value={compactPaise(billed)} hint={`${rows.length} invoices in view`} />
        <StatCard label="Collected" value={compactPaise(collected)} tone="positive" />
        <StatCard label="Outstanding" value={compactPaise(due)} tone="warning" />
        <StatCard label="Average bill" value={paise(rows.length ? billed / rows.length : 0)} tone="gold" />
      </div>

      <Card className="mt-4 p-4">
        <form className="flex flex-col gap-2 sm:flex-row sm:items-center" action="/invoices">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Invoice number, customer or mobile"
              className="h-9 pl-9"
            />
          </div>
          <select
            name="status"
            defaultValue={status}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="unpaid">Unpaid</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            name="branch"
            defaultValue={branchId}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            aria-label="Filter by showroom"
          >
            <option value="all">All showrooms</option>
            {branchRows.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
          <Button type="submit" variant="secondary" className="h-9">
            Apply
          </Button>
          {q || status !== "all" || branchId !== "all" ? (
            <Button asChild variant="ghost" className="h-9">
              <Link href="/invoices">Clear</Link>
            </Button>
          ) : null}
        </form>
      </Card>

      <Card className="mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-4 py-3 font-medium">Invoice</th>
                <th className="px-3 py-3 font-medium">Customer</th>
                <th className="px-3 py-3 font-medium">Showroom</th>
                <th className="px-3 py-3 font-medium">Channel</th>
                <th className="px-3 py-3 text-right font-medium">Total</th>
                <th className="px-3 py-3 text-right font-medium">Due</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.invoice.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <Link href={`/invoices/${row.invoice.id}`} className="font-medium hover:underline">
                      {row.invoice.invoiceNo}
                    </Link>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDateTime(row.invoice.invoiceDate)}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <p>{row.customerName ?? "Walk-in customer"}</p>
                    <p className="text-[11px] text-muted-foreground">{row.customerMobile ?? "—"}</p>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{row.branchName ?? "—"}</td>
                  <td className="px-3 py-3">
                    <Badge variant="outline" className="rounded-full text-[10px] capitalize">
                      {row.invoice.channel}
                    </Badge>
                  </td>
                  <td className="tabular px-3 py-3 text-right">{paise(row.invoice.totalPaise)}</td>
                  <td className={`tabular px-3 py-3 text-right ${row.invoice.duePaise > 0 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
                    {paise(row.invoice.duePaise)}
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={row.invoice.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
                      <Link href={`/invoices/${row.invoice.id}`}>View</Link>
                    </Button>
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center">
                    <p className="text-sm font-medium">No invoices match these filters</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Clear the filters or start a new sale at the counter.
                    </p>
                    <Button asChild size="sm" className="mt-4">
                      <Link href="/pos">Start a sale</Link>
                    </Button>
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
