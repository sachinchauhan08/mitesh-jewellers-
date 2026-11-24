import { grams, numberToWordsINR, paise, rupees } from "@/lib/format";
import type { InvoiceDetail } from "@/lib/queries/invoice";

export function InvoiceDocument({
  invoice,
  format = "a4",
}: {
  invoice: InvoiceDetail;
  format?: "a4" | "thermal";
}) {
  const { invoice: inv, customer, branch, items, settings } = invoice;

  if (format === "thermal") {
    return (
      <div className="mx-auto w-[80mm] bg-white p-3 font-mono text-[10px] leading-snug text-black">
        <div className="text-center">
          <p className="text-sm font-bold tracking-widest">AURA JEWELS</p>
          <p>{settings.company_address}</p>
          <p>GSTIN: {settings.company_gstin}</p>
          <p>Ph: {settings.company_phone}</p>
        </div>
        <div className="my-2 border-y border-dashed border-black/40 py-1">
          <p>Invoice: {inv.invoiceNo}</p>
          <p>Date: {new Date(inv.invoiceDate).toLocaleString("en-IN")}</p>
          <p>Branch: {branch?.name ?? "—"}</p>
          <p>Customer: {customer?.name ?? "Walk-in"}</p>
          {customer?.mobile ? <p>Mobile: {customer.mobile}</p> : null}
        </div>
        {items.map((item) => (
          <div key={item.id} className="border-b border-dashed border-black/30 py-1">
            <p className="font-bold">{item.description}</p>
            <div className="flex justify-between">
              <span>
                {item.purity} · {grams(item.netWeightMg)} · {paise(item.ratePerGramPaise)}/g
              </span>
              <span>{paise(item.totalPaise)}</span>
            </div>
          </div>
        ))}
        <div className="mt-2 space-y-0.5">
          <Row label="Metal" value={paise(inv.subtotalPaise)} />
          <Row label="Making" value={paise(inv.makingPaise)} />
          <Row label="Wastage" value={paise(inv.wastagePaise)} />
          <Row label="Stone" value={paise(inv.stonePaise)} />
          <Row label="GST 3%" value={paise(inv.gstPaise)} />
          {inv.discountPaise ? <Row label="Discount" value={`-${paise(inv.discountPaise)}`} /> : null}
          {inv.oldGoldValuePaise ? (
            <Row label="Old gold" value={`-${paise(inv.oldGoldValuePaise)}`} />
          ) : null}
          <div className="my-1 border-t border-black/40" />
          <Row label="TOTAL" value={paise(inv.totalPaise)} bold />
          <Row label="Paid" value={paise(inv.paidPaise)} />
          <Row label="Due" value={paise(inv.duePaise)} />
        </div>
        <p className="mt-2 text-center">Thank you · BIS Hallmarked</p>
        <p className="text-center text-[8px]">Goods once sold are exchangeable within 7 days with invoice.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[820px] bg-white p-8 text-[#211b15] shadow-sm print:shadow-none">
      <div className="flex items-start justify-between gap-6 border-b border-[#e6ddcf] pb-6">
        <div>
          <p className="font-display text-3xl tracking-wide">Aura Jewels</p>
          <p className="mt-1 max-w-[280px] text-xs leading-relaxed text-[#6b5d4d]">
            {settings.company_address}
          </p>
          <p className="mt-1 text-xs text-[#6b5d4d]">
            GSTIN {settings.company_gstin} · {settings.company_phone}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#a1865a]">Tax invoice</p>
          <p className="mt-1 text-lg font-semibold">{inv.invoiceNo}</p>
          <p className="text-xs text-[#6b5d4d]">
            {new Date(inv.invoiceDate).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
          <p className="text-xs text-[#6b5d4d]">{branch?.name}</p>
          {inv.status === "cancelled" ? (
            <p className="mt-2 inline-block border border-red-600 px-2 py-0.5 text-[10px] uppercase tracking-widest text-red-600">
              Cancelled
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 py-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#a1865a]">Billed to</p>
          <p className="mt-1 text-sm font-semibold">{customer?.name ?? "Walk-in customer"}</p>
          {customer?.mobile ? <p className="text-xs text-[#6b5d4d]">{customer.mobile}</p> : null}
          {customer?.address ? (
            <p className="max-w-[240px] text-xs text-[#6b5d4d]">
              {customer.address}
              {customer.city ? `, ${customer.city}` : ""}
              {customer.pincode ? ` ${customer.pincode}` : ""}
            </p>
          ) : null}
        </div>
        <div className="text-right text-xs text-[#6b5d4d]">
          <p>
            <span className="text-[#a1865a]">Payment</span>{" "}
            <span className="uppercase">{inv.paymentMode}</span>
          </p>
          <p>
            <span className="text-[#a1865a]">Channel</span>{" "}
            <span className="uppercase">{inv.channel}</span>
          </p>
          <p>
            <span className="text-[#a1865a]">Served by</span> {inv.createdBy ?? "—"}
          </p>
          <p>
            <span className="text-[#a1865a]">Gold rate</span> {paise(inv.goldRate22kPaise)}/g (22K)
          </p>
        </div>
      </div>

      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-y border-[#e6ddcf] text-left text-[9px] uppercase tracking-[0.12em] text-[#8a7965]">
            <th className="py-2.5 font-medium">Description</th>
            <th className="py-2.5 font-medium">HSN</th>
            <th className="py-2.5 font-medium">Purity</th>
            <th className="py-2.5 text-right font-medium">Net wt</th>
            <th className="py-2.5 text-right font-medium">Rate/g</th>
            <th className="py-2.5 text-right font-medium">Making</th>
            <th className="py-2.5 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id} className="border-b border-[#f0e9dd]">
              <td className="py-2.5">
                <span className="text-[#a1865a]">{String(index + 1).padStart(2, "0")}</span>{" "}
                {item.description}
              </td>
              <td className="py-2.5 text-[#6b5d4d]">{item.hsn}</td>
              <td className="py-2.5 text-[#6b5d4d]">{item.purity}</td>
              <td className="tabular py-2.5 text-right text-[#6b5d4d]">{grams(item.netWeightMg)}</td>
              <td className="tabular py-2.5 text-right text-[#6b5d4d]">{paise(item.ratePerGramPaise)}</td>
              <td className="tabular py-2.5 text-right text-[#6b5d4d]">{paise(item.makingPaise)}</td>
              <td className="tabular py-2.5 text-right font-medium">{rupees(item.totalPaise)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-5 grid gap-8 sm:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#a1865a]">Amount in words</p>
            <p className="mt-1 text-xs capitalize text-[#6b5d4d]">{numberToWordsINR(inv.totalPaise)}</p>
          </div>
          {inv.notes ? (
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#a1865a]">Notes</p>
              <p className="mt-1 text-xs text-[#6b5d4d]">{inv.notes}</p>
            </div>
          ) : null}
          <div className="text-[10px] leading-relaxed text-[#8a7965]">
            <p className="font-medium uppercase tracking-[0.16em] text-[#a1865a]">Terms</p>
            <p>{settings.invoice_footer}</p>
            <p>Goods once sold are exchangeable within 7 days with the original invoice.</p>
            <p>Hallmarking charges included where applicable. E&amp;OE.</p>
          </div>
        </div>

        <div className="space-y-1.5 text-xs">
          <Line label="Metal value" value={rupees(inv.subtotalPaise)} />
          <Line label="Making charges" value={rupees(inv.makingPaise)} />
          <Line label="Wastage" value={rupees(inv.wastagePaise)} />
          <Line label="Stone charges" value={rupees(inv.stonePaise)} />
          <Line label="GST 3%" value={rupees(inv.gstPaise)} />
          {inv.discountPaise ? <Line label="Discount" value={`-${rupees(inv.discountPaise)}`} /> : null}
          {inv.oldGoldValuePaise ? (
            <Line label="Old gold exchange" value={`-${rupees(inv.oldGoldValuePaise)}`} />
          ) : null}
          {inv.roundOffPaise ? <Line label="Round off" value={rupees(inv.roundOffPaise)} /> : null}
          <div className="my-1 border-t border-[#e6ddcf]" />
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] uppercase tracking-[0.16em] text-[#a1865a]">Total</span>
            <span className="tabular text-lg font-semibold">{rupees(inv.totalPaise)}</span>
          </div>
          <Line label="Amount received" value={rupees(inv.paidPaise)} />
          <div className="flex justify-between font-medium">
            <span>Balance due</span>
            <span className={`tabular ${inv.duePaise > 0 ? "text-red-600" : "text-emerald-700"}`}>
              {rupees(inv.duePaise)}
            </span>
          </div>
          <div className="mt-6 border-t border-[#e6ddcf] pt-6 text-center text-[10px] text-[#8a7965]">
            <p>For Aura Jewels</p>
            <p className="mt-8 border-t border-[#d8cbb6] pt-1">Authorised signatory</p>
          </div>
        </div>
      </div>

      <p className="mt-6 border-t border-[#e6ddcf] pt-3 text-center text-[10px] text-[#8a7965]">
        Thank you for choosing Aura Jewels · BIS hallmarked · {settings.company_email}
      </p>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[#6b5d4d]">
      <span>{label}</span>
      <span className="tabular text-[#211b15]">{value}</span>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
