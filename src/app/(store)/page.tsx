import { desc, eq, sql } from "drizzle-orm";
import { Clock, MapPin, Phone, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { categories, products } from "@/lib/db/schema";
import { getLatestRates } from "@/lib/rates";
import { storePricePaise } from "@/lib/store";
import { StoreShell } from "@/components/store/store-shell";
import { BRAND } from "@/lib/brand";
import { grams, paise } from "@/lib/format";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mitesh Jewellers — Gold & silver jewellery in Babra",
  description:
    "Hallmarked gold, silver and diamond jewellery in Babra, Gujarat. Live metal rates, transparent making charges and lifetime exchange.",
};

export default async function StoreHomePage() {
  const [rates, featured, categoryRows, stats] = await Promise.all([
    getLatestRates(),
    db
      .select()
      .from(products)
      .where(sql`${products.isFeatured} = true and ${products.status} = 'active'`)
      .orderBy(desc(products.createdAt))
      .limit(8),
    db
      .select({ id: categories.id, name: categories.name, slug: categories.slug, image: categories.imageUrl })
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(categories.sortOrder)
      .limit(6),
    db
      .select({
        count: sql<string>`count(*)`,
        pieces: sql<string>`coalesce(sum(${products.stockQty}), 0)`,
      })
      .from(products)
      .where(eq(products.status, "active")),
  ]);

  const gold22 = rates.find((r) => r.metal === "gold" && r.purity === "22K");
  const gold24 = rates.find((r) => r.metal === "gold" && r.purity === "24K");
  const silver = rates.find((r) => r.metal === "silver");
  const ticker = [
    gold22 && { label: "22K gold", value: `${paise(gold22.ratePerGramPaise)}/g` },
    gold24 && { label: "24K gold", value: `${paise(gold24.ratePerGramPaise)}/g` },
    silver && { label: "Silver", value: `${paise(silver.ratePerGramPaise)}/g` },
  ].filter(Boolean) as { label: string; value: string }[];

  const hero = featured[0];
  const rail = featured.slice(1, 5);

  return (
    <StoreShell rates={ticker}>
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 premium-noise opacity-60" aria-hidden />
        <div className="absolute inset-x-0 top-0 h-px gold-rule" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div>
            <p className="eyebrow">Babra, Gujarat · Hallmarked gold &amp; silver</p>
            <h1 className="mt-5 font-display text-[42px] leading-[1.02] tracking-[-0.01em] sm:text-6xl lg:text-[68px]">
              The gold you
              <br />
              were promised,
              <br />
              <span className="gold-text">weighed honestly.</span>
            </h1>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground">
              {BRAND.name} has served Babra families from Mahadev Complex on Main Bazaar Road.
              Every piece is BIS-hallmarked, weighed to the milligram and priced from the
              day&apos;s authorised rate — making charges printed, never guessed.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="/shop"
                className="sheen inline-flex h-12 items-center rounded-full bg-primary px-7 text-[13px] font-medium tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Explore the collection
              </a>
              <a
                href={BRAND.mapsHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-border bg-card px-6 text-[13px] font-medium transition-colors hover:border-gold/50 hover:bg-gold-soft/40"
              >
                <MapPin className="size-4 text-gold-deep" /> Visit the store
              </a>
            </div>

            <dl className="mt-10 grid max-w-lg grid-cols-3 divide-x divide-border border-y border-border py-5">
              {[
                { label: "Pieces in store", value: String(stats[0]?.pieces ?? 0) },
                { label: "Designs", value: String(stats[0]?.count ?? 0) },
                { label: "Exchange", value: "Lifetime" },
              ].map((item) => (
                <div key={item.label} className="px-4 first:pl-0 last:pr-0">
                  <dd className="tabular font-display text-2xl">{item.value}</dd>
                  <dt className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {item.label}
                  </dt>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            {hero ? (
              <a
                href={`/shop/${hero.slug}`}
                className="group relative block aspect-[4/5] overflow-hidden rounded-[28px] border border-border bg-muted shadow-luxe"
              >
                {hero.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={hero.images[0]}
                    alt={hero.name}
                    className="size-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.04]"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-md">
                  <div className="min-w-0 text-white">
                    <p className="text-[9px] uppercase tracking-[0.24em] text-white/70">
                      Signature piece
                    </p>
                    <p className="mt-1 truncate font-display text-lg leading-tight">{hero.name}</p>
                    <p className="tabular mt-0.5 text-[11px] text-white/75">
                      {hero.purity} · {grams(hero.netWeightMg)}
                    </p>
                  </div>
                  <p className="tabular shrink-0 text-sm font-semibold text-white">
                    {paise(storePricePaise(hero, rates))}
                  </p>
                </div>
              </a>
            ) : null}
            <div className="absolute -left-4 top-6 hidden rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-soft backdrop-blur sm:block">
              <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">22K gold</p>
              <p className="tabular mt-1 text-sm font-semibold text-gold-deep">
                {paise(gold22?.ratePerGramPaise)}<span className="text-[10px] font-normal text-muted-foreground">/g</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Collections</p>
            <h2 className="mt-2 font-display text-3xl sm:text-[38px]">Shop by collection</h2>
          </div>
          <a href="/shop" className="text-xs font-medium text-gold-deep hover:underline">
            View everything →
          </a>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categoryRows.map((category, index) => (
            <a
              key={category.id}
              href={`/shop?category=${category.slug}`}
              className={`group relative overflow-hidden rounded-2xl border border-border bg-muted card-lift ${
                index === 0 ? "sm:col-span-2 aspect-[2/1]" : "aspect-[4/3]"
              }`}
            >
              {category.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={category.image}
                  alt={category.name}
                  className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
              <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
                <p className="font-display text-lg text-white">{category.name}</p>
                <span className="flex size-8 items-center justify-center rounded-full border border-white/30 text-white transition-colors group-hover:bg-white group-hover:text-black">
                  →
                </span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">New in the vault</p>
              <h2 className="mt-2 font-display text-3xl sm:text-[38px]">Fresh from the bench</h2>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Prices recalculate with the authorised rate each morning.
              </p>
            </div>
            <a href="/shop" className="text-xs font-medium text-gold-deep hover:underline">
              All jewellery →
            </a>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {(rail.length ? rail : featured).map((product) => (
              <a
                key={product.id}
                href={`/shop/${product.slug}`}
                className="group overflow-hidden rounded-2xl border border-border bg-card card-lift"
              >
                <div className="relative aspect-square overflow-hidden bg-muted">
                  {product.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : null}
                  <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.14em] text-gold-deep backdrop-blur">
                    {product.purity}
                  </span>
                </div>
                <div className="p-4">
                  <p className="truncate text-[13px] font-medium">{product.name}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {grams(product.netWeightMg)} · {product.metalType}
                  </p>
                  <p className="tabular mt-2 text-[15px] font-semibold">
                    {paise(storePricePaise(product, rates))}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <p className="eyebrow">Why families return</p>
            <h2 className="mt-2 font-display text-3xl sm:text-[38px]">
              A counter you can trust with your wedding gold.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
              We buy, sell and exchange — and we show our working. Purity is verified in front of
              you, the rate board is the billing rate, and old gold is valued against the same
              authorised rate as new metal.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                { title: "BIS hallmark + HUID", body: "Every gold piece is marked and traceable." },
                { title: "Rate-linked pricing", body: "Metal value from today's authorised rate." },
                { title: "Lifetime exchange", body: "Full metal value against a new purchase." },
                { title: "Cards & NFC", body: "Credit, debit and tap-to-pay accepted." },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-border bg-card p-4">
                  <p className="flex items-center gap-1.5 text-xs font-semibold">
                    <Sparkles className="size-3.5 text-gold" /> {item.title}
                  </p>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[26px] border border-border bg-primary p-8 text-primary-foreground shadow-luxe">
            <p className="text-[10px] uppercase tracking-[0.26em] text-primary-foreground/50">
              Visit the store
            </p>
            <p className="mt-2 font-display text-2xl">{BRAND.addressLines[0]}</p>
            <p className="text-sm text-primary-foreground/70">{BRAND.addressLines[1]}</p>

            <div className="mt-6 space-y-3 border-t border-primary-foreground/15 pt-6 text-xs">
              <p className="flex items-center gap-2.5">
                <Phone className="size-3.5 text-gold" />
                <a href={BRAND.phoneHref} className="hover:underline">{BRAND.phone}</a>
              </p>
              {BRAND.hours.map((slot) => (
                <p key={slot.days} className="flex items-center gap-2.5">
                  <Clock className="size-3.5 text-gold" />
                  <span className="text-primary-foreground/70">{slot.days}</span>
                  <span className="ml-auto tabular">{slot.time}</span>
                </p>
              ))}
              <p className="flex items-center gap-2.5">
                <MapPin className="size-3.5 text-gold" />
                <span className="text-primary-foreground/70">{BRAND.payments.join(" · ")}</span>
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <a
                href={BRAND.mapsHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center rounded-full bg-gold px-5 text-xs font-medium text-primary transition-colors hover:brightness-105"
              >
                Get directions
              </a>
              {BRAND.profiles.map((profile) => (
                <a
                  key={profile.label}
                  href={profile.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center rounded-full border border-primary-foreground/20 px-4 text-xs text-primary-foreground/75 transition-colors hover:border-gold/60 hover:text-primary-foreground"
                >
                  {profile.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
    </StoreShell>
  );
}
