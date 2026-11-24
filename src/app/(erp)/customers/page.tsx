import Link from "next/link";
import { and, asc, count, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { Cake, Search, Users } from "lucide-react";
import { db } from "@/lib/db";
import { customers, salesInvoices } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth-helpers";
import { compactPaise, formatDate, initials, paise } from "@/lib/format";
import { PageHeader } from "@/components/erp/page-header";
import { StatCard } from "@/components/erp/stat-card";
import { AddCustomerDialog } from "@/components/erp/add-customer-dialog";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Customers" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireSession();
  const params = await searchParams;
  const q = params.q?.trim();

  const [rows, spendRows, totals] = await Promise.all([
    db
      .select()
      .from(customers)
      .where(
        q
          ? or(ilike(customers.name, `%${q}%`), ilike(customers.mobile, `%${q}%`))
          : eq(customers.isActive, true),
      )
      .orderBy(asc(customers.name))
      .limit(200),
    db
      .select({
        customerId: salesInvoices.customerId,
        spent: sql<string>`coalesce(sum(${salesInvoices.totalPaise}), 0)`,
        invoices: count(),
        lastPurchase: sql<string>`max(${salesInvoices.invoiceDate})`,
      })
      .from(salesInvoices)
      .where(ne(salesInvoices.status, "cancelled"))
      .groupBy(salesInvoices.customerId),
    db
      .select({
        total: sql<string>`count(*)`,
        outstanding: sql<string>`coalesce(sum(${customers.outstandingPaise}), 0)`,
        advance: sql<string>`coalesce(sum(${customers.advancePaise}), 0)`,
      })
      .from(customers)
      .where(eq(customers.isActive, true)),
  ]);

  const spendMap = new Map(spendRows.map((row) => [row.customerId, row]));
  const stats = totals[0];
  const thisMonth = new Date().getMonth() + 1;
  const birthdays = rows.filter(
    (row) => row.dateOfBirth && new Date(row.dateOfBirth).getMonth() + 1 === thisMonth,
  ).length;

  return (
    <div>
      <PageHeader
        eyebrow="Customer book"
        title="Customers"
        description="Profiles, purchase history, loyalty, advances and outstanding balances."
        actions={<AddCustomerDialog />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Customers" value={String(stats?.total ?? 0)} icon={Users} />
        <StatCard
          label="Outstanding"
          value={compactPaise(Number(stats?.outstanding ?? 0))}
          tone="warning"
        />
        <StatCard label="Advances held" value={compactPaise(Number(stats?.advance ?? 0))} tone="positive" />
        <StatCard
          label="Birthdays this month"
          value={String(birthdays)}
          icon={Cake}
          tone="gold"
          hint="Send a WhatsApp wish with one tap"
        />
      </div>

      <Card className="mt-4 p-4">
        <form action="/customers" className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Search by name or mobile"
              className="h-9 pl-9"
            />
          </div>
          <Button type="submit" variant="secondary" className="h-9">
            Search
          </Button>
          {q ? (
            <Button asChild variant="ghost" className="h-9">
              <Link href="/customers">Clear</Link>
            </Button>
          ) : null}
        </form>
      </Card>

      <Card className="mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-3 py-3 font-medium">City</th>
                <th className="px-3 py-3 text-right font-medium">Lifetime spend</th>
                <th className="px-3 py-3 text-right font-medium">Invoices</th>
                <th className="px-3 py-3 font-medium">Last purchase</th>
                <th className="px-3 py-3 text-right font-medium">Outstanding</th>
                <th className="px-4 py-3 text-right font-medium">Loyalty</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((customer) => {
                const spend = spendMap.get(customer.id);
                return (
                  <tr key={customer.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gold-soft text-xs font-semibold text-gold-deep">
                          {initials(customer.name)}
                        </span>
                        <div>
                          <Link href={`/customers/${customer.id}`} className="font-medium hover:underline">
                            {customer.name}
                          </Link>
                          <p className="text-[11px] text-muted-foreground">{customer.mobile}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{customer.city ?? "—"}</td>
                    <td className="tabular px-3 py-3 text-right">
                      {compactPaise(Number(spend?.spent ?? 0))}
                    </td>
                    <td className="tabular px-3 py-3 text-right text-xs">{spend?.invoices ?? 0}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {spend?.lastPurchase ? formatDate(spend.lastPurchase) : "—"}
                    </td>
                    <td className={`tabular px-3 py-3 text-right ${customer.outstandingPaise > 0 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
                      {paise(customer.outstandingPaise)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs">{customer.loyaltyPoints} pts</td>
                  </tr>
                );
              })}
              {!rows.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <p className="text-sm font-medium">No customers found</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Try another search, or add the customer to the book.
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
