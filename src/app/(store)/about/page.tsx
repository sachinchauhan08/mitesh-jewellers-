import type { Metadata } from "next";
import { getLatestRates } from "@/lib/rates";
import { BRAND } from "@/lib/brand";
import { paise } from "@/lib/format";
import { StoreShell } from "@/components/store/store-shell";

export const metadata: Metadata = {
  title: "The house",
  description:
    "Mitesh Jewellers is a gold and silver jewellery store on Main Bazaar Road in Babra, Gujarat.",
};

export default async function AboutPage() {
  const rates = await getLatestRates();
  const ticker = rates
    .filter((r) => r.metal === "gold" || r.metal === "silver")
    .slice(0, 4)
    .map((r) => ({ label: `${r.purity} ${r.metal}`, value: `${paise(r.ratePerGramPaise)}/g` }));

  return (
    <StoreShell rates={ticker}>
      <div className="mx-auto max-w-4xl px-4 py-14">
        <p className="eyebrow">The house</p>
        <h1 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">
          A neighbourhood jeweller, run the way it should be.
        </h1>
        <div className="mt-7 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            {BRAND.name} is a gold and silver jewellery store at Mahadev Complex on Main Bazaar
            Road in {BRAND.city}, {BRAND.state}. Families come to us for wedding sets, everyday
            gold, silver gifting and honest old-gold exchange — and they come back because the
            numbers are the same every time.
          </p>
          <p>
            Every gold piece is BIS-hallmarked with a HUID. Metal value is computed from the
            day&apos;s authorised rate, making charges and wastage are printed separately on the
            bill, and GST is shown on its own line. If a piece is exchanged, it is tested and
            weighed in front of you, at the same rate board used for new metal.
          </p>
          <p>
            The same system our staff use at the counter — billing, inventory, metal rates, repairs
            and customer ledgers — powers the prices you see here. That is why the rate on this site
            matches the rate in the showroom.
          </p>
        </div>

        <div className="mt-9 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Showroom", value: BRAND.city },
            { label: "Hallmark", value: "BIS + HUID" },
            { label: "Exchange", value: "Lifetime" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-1.5 font-display text-2xl">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-[26px] border border-gold/30 bg-gold-soft/50 p-7">
          <h2 className="font-display text-2xl">How we price a piece</h2>
          <ol className="mt-4 space-y-3 text-xs leading-relaxed text-muted-foreground">
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
              charges, itemised by weight and quality.
            </li>
            <li>
              <span className="font-medium text-foreground">4. GST</span> — 3% on jewellery, applied
              after the above and printed on the invoice.
            </li>
          </ol>
        </div>

        <div className="mt-8 rounded-2xl border border-border p-6">
          <h2 className="font-display text-xl">Come and see us</h2>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {BRAND.address}
            <br />
            {BRAND.hours.map((slot) => `${slot.days}: ${slot.time}`).join(" · ")}
            <br />
            <a href={BRAND.phoneHref} className="font-medium text-gold-deep hover:underline">
              {BRAND.phone}
            </a>
          </p>
        </div>
      </div>
    </StoreShell>
  );
}
