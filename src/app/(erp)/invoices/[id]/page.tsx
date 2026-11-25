import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, MessageCircle, User } from "lucide-react";
import { canManage, requireSession } from "@/lib/auth-helpers";
import { getInvoiceDetail } from "@/lib/queries/invoice";
import { formatDateTime, paise } from "@/lib/format";
import { PageHeader, StatusBadge } from "@/components/erp/page-header";
import { InvoiceActions } from "@/components/erp/invoice-actions";
import { InvoiceDocument } from "@/components/invoice/invoice-document";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const metadata = { title: "Invoice" };

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const query = await searchParams;
  const invoice = await getInvoiceDetail(Number(id));
  if (!invoice) notFound();
  const canCancel = canManage(session.user.role);

  return (
    <div>
      <Link
        href="/invoices"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Back to invoices
      </Link>

      {query.created === "1" ? (
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-emerald-600/25 bg-emerald-600/5 px-4 py-3">
          <CheckCircle2 className="mt-0.5 size-5 text-emerald-700 dark:text-emerald-400" />
          <div>
            <p className="text-sm font-medium">Sale completed</p>
            <p className="text-xs text-muted-foreground">
              {invoice.invoice.invoiceNo} is saved, stock updated and the customer ledger
              adjusted. Print or share the invoice below.
            </p>
          </div>
        </div>
      ) : null}

      <PageHeader
        eyebrow={`${invoice.invoice.channel === "online" ? "Online order" : "Counter sale"} · ${formatDateTime(invoice.invoice.invoiceDate)}`}
        title={invoice.invoice.invoiceNo}
        description={`${invoice.customer?.name ?? "Walk-in customer"} · ${invoice.branch?.name ?? "Showroom"} · ${invoice.items.length} line items`}
        actions={<InvoiceActions invoice={invoice} canCancel={canCancel} />}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-3 sm:p-5">
          <InvoiceDocument invoice={invoice} />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Payment summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice total</span>
                <span className="tabular font-medium">{paise(invoice.invoice.totalPaise)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Received</span>
                <span className="tabular">{paise(invoice.invoice.paidPaise)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Balance</span>
                <span className={`tabular font-medium ${invoice.invoice.duePaise > 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                  {paise(invoice.invoice.duePaise)}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={invoice.invoice.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Mode</span>
                <span className="uppercase">{invoice.invoice.paymentMode}</span>
              </div>
              {invoice.payments.length ? (
                <div className="space-y-1.5 rounded-md bg-muted/60 p-3 text-xs">
                  {invoice.payments.map((payment) => (
                    <div key={payment.id} className="flex justify-between">
                      <span className="capitalize text-muted-foreground">
                        {payment.direction === "in" ? "Received" : "Refund"} · {payment.mode}
                      </span>
                      <span className="tabular">{paise(payment.amountPaise)}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="size-4 text-gold-deep" /> Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {invoice.customer ? (
                <>
                  <Link
                    href={`/customers/${invoice.customer.id}`}
                    className="font-medium hover:underline"
                  >
                    {invoice.customer.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{invoice.customer.mobile}</p>
                  <p className="text-xs text-muted-foreground">
                    {invoice.customer.city ?? "—"} · Loyalty {invoice.customer.loyaltyPoints} pts
                  </p>
                  <Button asChild variant="outline" size="sm" className="mt-2 w-full">
                    <Link href={`/customers/${invoice.customer.id}`}>Open customer ledger</Link>
                  </Button>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Walk-in sale with no customer profile attached.
                </p>
              )}
              {invoice.customer?.mobile ? (
                <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
                  <a
                    href={`https://wa.me/91${invoice.customer.mobile}?text=${encodeURIComponent(
                      `Namaste ${invoice.customer.name}, thank you for shopping at Mitesh Jewellers.`,
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="mr-2 size-3.5" /> Message customer
                  </a>
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {invoice.invoice.notes ?? "No notes on this invoice."}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
