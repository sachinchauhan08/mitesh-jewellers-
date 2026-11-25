import type { Metadata } from "next";
import { Clock, CreditCard, MapPin, Phone, Smartphone, Wallet } from "lucide-react";
import { getLatestRates } from "@/lib/rates";
import { BRAND } from "@/lib/brand";
import { paise } from "@/lib/format";
import { StoreShell } from "@/components/store/store-shell";

export const metadata: Metadata = {
  title: "Visit us",
  description:
    "Visit Mitesh Jewellers at Mahadev Complex, Main Bazaar Rd, Babra, Gujarat 365421. Open Mon–Sat 9am–8pm, Sun 9am–1pm.",
};

export default async function ContactPage() {
  const rates = await getLatestRates();
  const ticker = rates
    .filter((r) => r.metal === "gold" || r.metal === "silver")
    .slice(0, 4)
    .map((r) => ({ label: `${r.purity} ${r.metal}`, value: `${paise(r.ratePerGramPaise)}/g` }));

  return (
    <StoreShell rates={ticker}>
      <div className="mx-auto max-w-6xl px-4 py-14">
        <p className="eyebrow">Visit us</p>
        <h1 className="mt-3 max-w-2xl font-display text-4xl leading-tight sm:text-5xl">
          One showroom, in the heart of Babra.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Walk in for a bridal consultation, a repair estimate or an old-gold valuation. No
          appointment needed — a call ahead means we can keep the pieces you want ready.
        </p>

        <div className="mt-10 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
          <div className="rounded-[26px] border border-border bg-card p-6 shadow-soft">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-soft">
                <MapPin className="size-4 text-gold-deep" />
              </span>
              <div>
                <p className="font-display text-xl">{BRAND.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {BRAND.addressLines[0]}
                  <br />
                  {BRAND.addressLines[1]}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border p-4">
                <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  <Clock className="size-3" /> Opening hours
                </p>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {BRAND.hours.map((slot) => (
                    <li key={slot.days} className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{slot.days}</span>
                      <span className="tabular font-medium">{slot.time}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  <Wallet className="size-3" /> Payments accepted
                </p>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {BRAND.payments.map((payment) => (
                    <li key={payment} className="flex items-center gap-1.5">
                      {payment.toLowerCase().includes("card") ? (
                        <CreditCard className="size-3 text-gold-deep" />
                      ) : (
                        <Smartphone className="size-3 text-gold-deep" />
                      )}
                      {payment}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={BRAND.phoneHref}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Phone className="size-3.5" /> {BRAND.phone}
              </a>
              <a
                href={BRAND.mapsHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-5 text-xs font-medium hover:border-gold/50 hover:bg-gold-soft/40"
              >
                <MapPin className="size-3.5 text-gold-deep" /> Get directions
              </a>
            </div>
          </div>

          <div className="rounded-[26px] border border-border bg-secondary/50 p-6">
            <p className="eyebrow">Find us online</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Browse our latest designs, wholesale enquiries and customer reviews on the platforms
              below.
            </p>
            <ul className="mt-4 space-y-2">
              {BRAND.profiles.map((profile) => (
                <li key={profile.label}>
                  <a
                    href={profile.href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-xs font-medium transition-colors hover:border-gold/50"
                  >
                    {BRAND.name} on {profile.label}
                    <span className="text-gold-deep">→</span>
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-xl border border-gold/30 bg-gold-soft/50 p-4">
              <p className="text-xs font-semibold">Buyback, exchange &amp; repairs</p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                Bring your invoice and the piece. Purity is tested in front of you, weighed to the
                milligram and valued at the day&apos;s rate. Repairs carry a job number and a
                promised date.
              </p>
            </div>
          </div>
        </div>
      </div>
    </StoreShell>
  );
}
