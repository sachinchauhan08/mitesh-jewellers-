"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, MessageCircle, Printer, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { InvoiceDetail } from "@/lib/queries/invoice";

export function InvoiceActions({
  invoice,
  canCancel,
}: {
  invoice: InvoiceDetail;
  canCancel: boolean;
}) {
  const router = useRouter();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const number = (paise: number) => (paise / 100).toFixed(2);

  async function downloadPdf() {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("AURA JEWELS", 14, 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(invoice.settings.company_address ?? "", 14, 24);
    doc.text(`GSTIN: ${invoice.settings.company_gstin ?? "—"}`, 14, 29);
    doc.setFontSize(12);
    doc.text("TAX INVOICE", 196, 18, { align: "right" });
    doc.setFontSize(9);
    doc.text(invoice.invoice.invoiceNo, 196, 24, { align: "right" });
    doc.text(new Date(invoice.invoice.invoiceDate).toLocaleString("en-IN"), 196, 29, {
      align: "right",
    });

    doc.text("Billed to", 14, 42);
    doc.setFont("helvetica", "bold");
    doc.text(invoice.customer?.name ?? "Walk-in customer", 14, 48);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.customer?.mobile ?? "", 14, 53);
    doc.text(invoice.branch?.name ?? "", 14, 58);

    autoTable(doc, {
      startY: 66,
      head: [["Item", "Purity", "Net wt (g)", "Rate/g", "Amount"]],
      body: invoice.items.map((item) => [
        item.description,
        item.purity,
        (item.netWeightMg / 1000).toFixed(3),
        number(item.ratePerGramPaise),
        number(item.totalPaise),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [33, 27, 21] },
      columnStyles: { 4: { halign: "right" }, 3: { halign: "right" }, 2: { halign: "right" } },
    });

    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    const rows: [string, string][] = [
      ["Metal value", number(invoice.invoice.subtotalPaise)],
      ["Making charges", number(invoice.invoice.makingPaise)],
      ["Wastage", number(invoice.invoice.wastagePaise)],
      ["Stone charges", number(invoice.invoice.stonePaise)],
      ["GST", number(invoice.invoice.gstPaise)],
      ["Discount", `-${number(invoice.invoice.discountPaise)}`],
      ["Old gold exchange", `-${number(invoice.invoice.oldGoldValuePaise)}`],
      ["Total", number(invoice.invoice.totalPaise)],
      ["Received", number(invoice.invoice.paidPaise)],
      ["Balance due", number(invoice.invoice.duePaise)],
    ];
    doc.setFontSize(9);
    rows.forEach(([label, value], index) => {
      const y = finalY + index * 5;
      doc.text(label, 140, y);
      doc.text(`Rs. ${value}`, 196, y, { align: "right" });
    });
    doc.setFontSize(7);
    doc.text(invoice.settings.invoice_footer ?? "", 14, finalY + 58);
    doc.save(`${invoice.invoice.invoiceNo}.pdf`);
    toast.success("PDF downloaded");
  }

  function whatsapp() {
    const mobile = invoice.customer?.mobile;
    if (!mobile) {
      toast.error("Add a customer mobile number to share on WhatsApp.");
      return;
    }
    const link = `${window.location.origin}/print/invoice/${invoice.invoice.id}`;
    const message = `Namaste ${invoice.customer?.name ?? "ji"}, thank you for shopping at Mitesh Jewellers. Invoice ${invoice.invoice.invoiceNo} for ₹${number(invoice.invoice.totalPaise)}. View: ${link}`;
    window.open(`https://wa.me/91${mobile}?text=${encodeURIComponent(message)}`, "_blank");
  }

  async function cancelInvoice() {
    setCancelling(true);
    const response = await fetch(`/api/invoices/${invoice.invoice.id}`, {
      method: "PATCH",
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      toast.error(payload.error ?? "We could not cancel this invoice.");
      setCancelling(false);
      return;
    }
    toast.success("Invoice cancelled and stock restored");
    setCancelling(false);
    setCancelOpen(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="h-9"
        onClick={() => window.open(`/print/invoice/${invoice.invoice.id}`, "_blank")}
      >
        <Printer className="mr-2 size-4" /> Print
      </Button>
      <Button variant="outline" size="sm" className="h-9" onClick={downloadPdf}>
        <Download className="mr-2 size-4" /> PDF
      </Button>
      <Button variant="outline" size="sm" className="h-9" onClick={whatsapp}>
        <MessageCircle className="mr-2 size-4" /> WhatsApp
      </Button>
      {canCancel && invoice.invoice.status !== "cancelled" ? (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-destructive hover:text-destructive"
            onClick={() => setCancelOpen(true)}
          >
            <XCircle className="mr-2 size-4" /> Cancel invoice
          </Button>
          <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel {invoice.invoice.invoiceNo}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Stock will be returned to inventory, the customer ledger adjusted and
                  any payment recorded as a refund. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep invoice</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(event) => {
                    event.preventDefault();
                    cancelInvoice();
                  }}
                  disabled={cancelling}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  {cancelling ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  {cancelling ? "Cancelling…" : "Cancel invoice"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}
    </div>
  );
}
