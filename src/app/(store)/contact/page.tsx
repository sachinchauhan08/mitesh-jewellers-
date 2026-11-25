import type { Metadata } from "next";
import { getLatestRates } from "@/lib/rates";
import { paise } from "@/lib/format";
import { StoreShell } from "@/components/store/store-shell";

export const metadata: Metadata = {
  title: "Showrooms",
  description: "Visit Aura Jewels in Zaveri Bazaar, Laxmi Road or Ring Road — or reach us on WhatsApp.",
};

const SHOWROOMS = [
  {
    name: "Zaveri Bazaar",
    address: "12 Kalbadevi Road, Zaveri Bazaar, Mumbai 400002",
    phone: "+91 22 2240 1122",
    hours: "Mon–Sat, 10:30 am – 8:00 pm",
  },
  {
    name: "Laxmi Road",
    address: "480 Laxmi Road, Sadashiv Peth, Pune 411030",
    phone: "+91 20 2445 3311",
    hours: "Mon–Sat, 10:30 am – 8:30 pm",
  },
  {
    name: "Ring Road",
    address: "Ring Road, Surat 395002",
    phone: "+91 261 244 8899",
    hours: "Mon–Sat, 11:00 am – 8:00 pm",
  },
];

export default async function ContactPage() {
  const rates = await getLatestRates();
  const ticker = rates
    .filter((r) => r.metal === "gold" || r.metal === "silver")
    .slice(0, 4)
    .map((r) => ({ label: `${r.purity} ${r.metal}`, value: `${paise(r.ratePerGramPaise)}/g` }));

  return (
    <StoreShell rates={ticker}>
      <div className="mx-auto max-w-6xl px-4 py-12">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-gold-deep">Visit us</p>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl">Three showrooms, one standard</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Walk in for a bridal consultation, a repair estimate or an old-gold valuation. No
          appointment needed — but a call ahead means we can keep the pieces you want ready.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {SHOWROOMS.map((showroom) => (
            <div key={showroom.name} className="rounded-xl border border-border bg-card p-5">
              <p className="font-display text-lg">{showroom.name}</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{showroom.address}</p>
              <p className="mt-3 text-xs">{showroom.phone}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{showroom.hours}</p>
              <a
                href={`tel:${showroom.phone.replace(/\s/g, "")}`}
                className="mt-4 inline-flex h-9 items-center rounded-full border border-border px-4 text-xs font-medium hover:bg-muted"
              >
                Call the showroom
              </a>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-4 rounded-2xl border border-border bg-secondary/40 p-6 sm:grid-cols-2">
          <div>
            <h2 className="font-display text-xl">Buyback &amp; exchange</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Bring your Aura invoice and the piece. We test purity in front of you, weigh to the
              milligram and quote the metal value at the day&apos;s rate, less the printed
              melting loss. You can take cash, bank transfer or adjust against a new purchase.
            </p>
          </div>
          <div>
            <h2 className="font-display text-xl">Repairs &amp; resizing</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Clasp repairs, re-polishing, ring resizing and re-stringing are handled in-house. We
              photograph the item at intake, give you a job number and message you when it is ready
              for pickup.
            </p>
          </div>
        </div>
      </div>
    </StoreShell>
  );
}
