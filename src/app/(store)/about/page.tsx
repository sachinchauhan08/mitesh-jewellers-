import type { Metadata } from "next";
import { getLatestRates } from "@/lib/rates";
import { paise } from "@/lib/format";
import { StoreShell } from "@/components/store/store-shell";

export const metadata: Metadata = {
  title: "Our story",
  description:
    "Aura Jewels has been making BIS-hallmarked gold and diamond jewellery in Mumbai since 1978.",
};

export default async function AboutPage() {
  const rates = await getLatestRates();
  const ticker = rates
    .filter((r) => r.metal === "gold" || r.metal === "silver")
    .slice(0, 4)
    .map((r) => ({ label: `${r.purity} ${r.metal}`, value: `${paise(r.ratePerGramPaise)}/g` }));

  return (
    <StoreShell rates={ticker}>
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-gold-deep">
          Our story
        </p>
        <h1 className="mt-2 font-display text-3xl leading-tight sm:text-4xl">
          Three generations at the same bench
        </h1>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Aura Jewels began in 1978 as a single counter on Kalbadevi Road, buying old gold and
            reworking it for families in the neighbourhood. The tools have changed; the habit has
            not. Every piece is still weighed in front of the customer, and the rate on the board is
            the rate on the bill.
          </p>
          <p>
            Today our karigars work from three showrooms across Mumbai, Pune and Surat. We buy
            bullion against the day&apos;s authorised rate, hallmark every gold piece with a BIS
            HUID, and keep the making charge printed separately so you always know what you are
            paying for the metal and what you are paying for the craft.
          </p>
          <p>
            Our ERP — the same system our staff use at the counter — prices every product live from
            the metal rate, tracks each gram through purchase, stock and sale, and records every
            old-gold receipt and repair job. That is why the price you see online matches the price
            at the counter.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Founded", value: "1978" },
            { label: "Showrooms", value: "3" },
            { label: "Hallmark", value: "BIS + HUID" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-border bg-card p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-1 font-display text-2xl">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-gold/30 bg-gold-soft/50 p-6">
          <h2 className="font-display text-xl">How we price a piece</h2>
          <ol className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">1. Metal value</span> — net weight ×
              today&apos;s authorised rate for the purity.
            </li>
            <li>
              <span className="font-medium text-foreground">2. Making &amp; wastage</span> — quoted
              per gram or per piece, shown separately on the bill.
            </li>
            <li>
              <span className="font-medium text-foreground">3. Stones</span> — diamond and gemstone
              charges, itemised by carat and quality.
            </li>
            <li>
              <span className="font-medium text-foreground">4. GST</span> — 3% on jewellery, applied
              after the above and printed on the invoice.
            </li>
          </ol>
        </div>
      </div>
    </StoreShell>
  );
}
