import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq, ne, sql } from "drizzle-orm";
import { ArrowLeft, CalendarHeart, Gem, Phone, ReceiptText, Wrench } from "lucide-react";
import { db } from "@/lib/db";
import {
  customers,
  oldGoldPurchases,
  repairs,
  salesInvoices,
} from "@/lib/db/schema";
import { requireSession } from "@/lib/auth-helpers";
import { compactPaise, formatDate, grams, initials, paise } from "@/lib/format";
import { PageHeader, StatusBadge } from "@/components/erp/page-header";
import { StatCard } from "@/components/erp/stat-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Customer profile" };

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const customerId = Number(id);
  if (!Number.isFinite(customerId)) notFound();

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);
  if (!customer) notFound();

  const [invoices, goldRows, repairRows, summary] = await Promise.all([
    db
      .select()
      .from(salesInvoices)
      .where(eq(salesInvoices.customerId, customerId))
      .orderBy(desc(salesInvoices.invoiceDate))
      .limit(50),
    db
      .select()
      .from(oldGoldPurchases)
      .where(eq(oldGoldPurchases.customerId, customerId))
      .orderBy(desc(oldGoldPurchases.date))
      .limit(20),
    db
      .select()
      .from(repairs)
      .where(eq(repairs.customerId, customerId))
      .orderBy(desc(repairs.receivedAt))
      .limit(20),
    db
      .select({
        spend: sql<string>`coalesce(sum(${salesInvoices.totalPaise}), 0)`,
        count: sql<string>`count(*)`,
        last: sql<string>`max(${salesInvoices.invoiceDate})`,
      })
      .from(salesInvoices)
      .where(
        sql`${salesInvoices.customerId} = ${customerId} and ${salesInvoices.status} <> 'cancelled'`,
      ),
  ]);

  const totals = summary[0];
  const openRepairs = repairRows.filter((r) => !["delivered", "cancelled"].includes(r.status));
  const goldWeight = goldRows.reduce((sum, row) => sum + row.netWeightMg, 0);

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/customers"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to customers
        </Link>
      </div>

      <PageHeader
        eyebrow={customer.code}
        title={customer.name}
        description={
          customer.city
            ? `${customer.city}${customer.state ? `, ${customer.state}` : ""} · Customer since ${formatDate(customer.createdAt)}`
            : `Customer since ${formatDate(customer.createdAt)}`
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="h-9 rounded-full px-3 text-xs capitalize">
              {customer.gender ?? "Retail"}
            </Badge>
            <Badge variant="outline" className="h-9 rounded-full px-3 text-xs">
              {customer.loyaltyPoints} loyalty pts
            </Badge>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Lifetime spend"
          value={compactPaise(Number(totals?.spend ?? 0))}
          hint={`${totals?.count ?? 0} invoices`}
          tone="gold"
        />
        <StatCard
          label="Outstanding"
          value={paise(customer.outstandingPaise)}
          tone={customer.outstandingPaise > 0 ? "warning" : "default"}
        />
        <StatCard label="Advance held" value={paise(customer.advancePaise)} tone="positive" />
        <StatCard
          label="Old gold sold"
          value={grams(goldWeight)}
          hint={`${goldRows.length} receipts`}
          icon={Gem}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <ReceiptText className="size-4 text-gold-deep" /> Purchase history
            </h2>
            <span className="text-[11px] text-muted-foreground">
              Last purchase {totals?.last ? formatDate(totals.last) : "—"}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Invoice</th>
                  <th className="px-3 py-2.5 font-medium">Date</th>
                  <th className="px-3 py-2.5 font-medium">Channel</th>
                  <th className="px-3 py-2.5 text-right font-medium">Total</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-2.5">
                      <Link href={`/invoices/${invoice.id}`} className="font-medium hover:underline">
                        {invoice.invoiceNo}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {formatDate(invoice.invoiceDate)}
                    </td>
                    <td className="px-3 py-2.5 text-xs capitalize text-muted-foreground">
                      {invoice.channel}
                    </td>
                    <td className="tabular px-3 py-2.5 text-right">{paise(invoice.totalPaise)}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={invoice.status} />
                    </td>
                  </tr>
                ))}
                {!invoices.length ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-xs text-muted-foreground">
                      No purchases yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-full bg-gold-soft text-sm font-semibold text-gold-deep">
                {initials(customer.name)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{customer.name}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="size-3" /> {customer.mobile}
                </p>
              </div>
            </div>
            <dl className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="truncate text-right">{customer.email ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Address</dt>
                <dd className="max-w-[60%] text-right">
                  {[customer.address, customer.city, customer.pincode].filter(Boolean).join(", ") || "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="flex items-center gap-1 text-muted-foreground">
                  <CalendarHeart className="size-3" /> Birthday
                </dt>
                <dd>{formatDate(customer.dateOfBirth)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="flex items-center gap-1 text-muted-foreground">
                  <CalendarHeart className="size-3" /> Anniversary
                </dt>
                <dd>{formatDate(customer.anniversary)}</dd>
              </div>
            </dl>
            {customer.preferences ? (
              <div className="mt-4 rounded-lg bg-muted/60 p-3 text-xs">
                <p className="font-medium">Preferences</p>
                <p className="mt-1 text-muted-foreground">{customer.preferences}</p>
              </div>
            ) : null}
            {customer.notes ? (
              <div className="mt-2 rounded-lg bg-muted/60 p-3 text-xs">
                <p className="font-medium">Notes</p>
                <p className="mt-1 text-muted-foreground">{customer.notes}</p>
              </div>
            ) : null}
          </Card>

          <Card className="p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Wrench className="size-4 text-gold-deep" /> Repairs
            </h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {openRepairs.length} open job{openRepairs.length === 1 ? "" : "s"}
            </p>
            <ul className="mt-3 space-y-2">
              {repairRows.slice(0, 5).map((repair) => (
                <li key={repair.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{repair.itemDescription}</span>
                    <span className="text-muted-foreground">{repair.jobNo}</span>
                  </span>
                  <StatusBadge status={repair.status} />
                </li>
              ))}
              {!repairRows.length ? (
                <li className="text-xs text-muted-foreground">No repair jobs.</li>
              ) : null}
            </ul>
          </Card>

          <Card className="p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Gem className="size-4 text-gold-deep" /> Old gold
            </h2>
            <ul className="mt-3 space-y-2">
              {goldRows.slice(0, 5).map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-2 text-xs">
                  <span>
                    <span className="block font-medium">{row.receiptNo}</span>
                    <span className="text-muted-foreground">
                      {grams(row.netWeightMg)} · {formatDate(row.date)}
                    </span>
                  </span>
                  <span className="tabular font-medium">{paise(row.finalValuePaise)}</span>
                </li>
              ))}
              {!goldRows.length ? (
                <li className="text-xs text-muted-foreground">No old-gold receipts.</li>
              ) : null}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
