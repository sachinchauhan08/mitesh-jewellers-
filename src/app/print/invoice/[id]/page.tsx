import Link from "next/link";
import { notFound } from "next/navigation";
import { getInvoiceDetail } from "@/lib/queries/invoice";
import { InvoiceDocument } from "@/components/invoice/invoice-document";
import { AutoPrint, PrintButton } from "@/components/invoice/auto-print";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Print invoice" };

export default async function PrintInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ format?: string; auto?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const invoice = await getInvoiceDetail(Number(id));
  if (!invoice) notFound();
  const format = query.format === "thermal" ? "thermal" : "a4";

  return (
    <div className="min-h-screen bg-[#efe9df] py-6 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex w-full max-w-[820px] items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-2">
          <Button asChild variant={format === "a4" ? "default" : "outline"} size="sm">
            <Link href={`/print/invoice/${id}?format=a4`}>A4 invoice</Link>
          </Button>
          <Button asChild variant={format === "thermal" ? "default" : "outline"} size="sm">
            <Link href={`/print/invoice/${id}?format=thermal`}>Thermal 80mm</Link>
          </Button>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/invoices/${id}`}>Back to invoice</Link>
        </Button>
      </div>
      <div className={format === "thermal" ? "mx-auto w-[80mm] bg-white shadow-sm" : "mx-auto w-full max-w-[820px] bg-white shadow-sm"}>
        <InvoiceDocument invoice={invoice} format={format} />
      </div>
      <div className="no-print mx-auto mt-4 flex w-full max-w-[820px] justify-center">
        <PrintButton />
      </div>
      <AutoPrint enabled={query.auto === "1"} />
    </div>
  );
}
