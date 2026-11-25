import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, products } from "@/lib/db/schema";
import { getLatestRates } from "@/lib/rates";
import { storePricePaise } from "@/lib/store";
import { StoreShell } from "@/components/store/store-shell";
import { paise } from "@/lib/format";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aura Jewels — BIS-hallmarked gold & diamond jewellery",
  description:
    "Shop BIS-hallmarked 22K gold, natural diamond and bridal jewellery. Live metal rates, transparent making charges and lifetime buyback.",
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

  const rate22 = rates.find((r) => r.metal === "gold" && r.purity === "22K");
  const rate24 = rates.find((r) => r.metal === "gold" && r.purity === "24K");
  const rateSilver = rates.find((r) => r.metal === "silver");
  const ticker = [
    rate22 && { label: "22K gold", value: `${paise(rate22.ratePerGramPaise)}/g` },
    rate24 && { label: "24K gold", value: `${paise(rate24.ratePerGramPaise)}/g` },
    rateSilver && { label: "Silver", value: `${paise(rateSilver.ratePerGramPaise)}/g` },
  ].filter(Boolean) as { label: string; value: string }[];

  const hero = featured[0];

  return (
    <StoreShell rates={ticker}>
      <section className="relative overflow-hidden border-b border-border bg-secondary/40">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 lg:grid-cols-2 lg:py-20">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-gold-deep">
              Since 1978 · Zaveri Bazaar, Mumbai
            </p>
            <h1 className="mt-3 font-display text-4xl leading-tight sm:text-5xl lg:text-6xl">
              Heirlooms, <span className="text-gold-deep">priced honestly.</span>
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
              Every piece is BIS-hallmarked with a HUID, weighed to the milligram and priced from
              today&apos;s authorised rate. No hidden making charges, no surprises at the counter.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="/shop"
                className="inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Browse the collection
              </a>
              <a
                href="/contact"
                className="inline-flex h-11 items-center rounded-full border border-border bg-card px-6 text-sm font-medium hover:bg-muted"
              >
                Book a showroom visit
              </a>
            </div>
            <dl className="mt-8 grid max-w-md grid-cols-3 gap-4 border-t border-border pt-5">
              <div>
                <dt className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Pieces live</dt>
                <dd className="tabular mt-1 text-lg font-semibold">{stats[0]?.pieces ?? 0}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Designs</dt>
                <dd className="tabular mt-1 text-lg font-semibold">{stats[0]?.count ?? 0}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Buyback</dt>
                <dd className="mt-1 text-lg font-semibold">Lifetime</dd>
              </div>
            </dl>
          </div>
          {hero ? (
            <a
              href={`/shop/${hero.slug}`}
              className="group relative block aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-muted"
            >
              {hero.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={hero.images[0]}
                  alt={hero.name}
                  className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : null}
              <div className="absolute inset-x-3 bottom-3 rounded-xl bg-background/92 px-4 py-3 backdrop-blur">
                <p className="text-[10px] uppercase tracking-[0.16em] text-gold-deep">Featured</p>
                <p className="mt-0.5 truncate text-sm font-medium">{hero.name}</p>
                <p className="tabular mt-0.5 text-xs text-muted-foreground">
                  {hero.purity} · {paise(storePricePaise(hero, rates))}
                </p>
              </div>
            </a>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl">Shop by collection</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Curated by metal and occasion — every piece hallmarked.
            </p>
          </div>
          <a href="/shop" className="text-xs font-medium text-gold-deep hover:underline">
            View all →
          </a>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categoryRows.map((category) => (
            <a
              key={category.id}
              href={`/shop?category=${category.slug}`}
              className="group relative aspect-[16/9] overflow-hidden rounded-xl border border-border bg-muted"
            >
              {category.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={category.image}
                  alt={category.name}
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
              <p className="absolute inset-x-3 bottom-3 text-sm font-medium text-white">
                {category.name}
              </p>
            </a>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-secondary/30">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl">New in the vault</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Prices update with the authorised rate each morning.
              </p>
            </div>
            <a href="/shop" className="text-xs font-medium text-gold-deep hover:underline">
              All jewellery →
            </a>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((product) => (
              <a
                key={product.id}
                href={`/shop/${product.slug}`}
                className="group overflow-hidden rounded-xl border border-border bg-card"
              >
                <div className="aspect-square overflow-hidden bg-muted">
                  {product.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : null}
                </div>
                <div className="p-3">
                  <p className="truncate text-xs font-medium">{product.name}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    {product.purity} · {(product.netWeightMg / 1000).toFixed(3)} g
                  </p>
                  <p className="tabular mt-1 text-sm font-semibold">
                    {paise(storePricePaise(product, rates))}
                  </p>
                </div>
              </a>
            ))}
            {!featured.length ? (
              <p className="col-span-full rounded-xl border border-dashed border-border p-10 text-center text-xs text-muted-foreground">
                New arrivals are being photographed. Please check back shortly.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            {
              title: "BIS hallmark & HUID",
              body: "Every gold piece carries a six-digit HUID you can verify with BIS Care. Nothing leaves the counter unmarked.",
            },
            {
              title: "Rate-linked pricing",
              body: "Metal value is computed from the day's authorised rate. Making charges and wastage are printed on the bill.",
            },
            {
              title: "Lifetime exchange",
              body: "Exchange any Aura piece for its full metal value against a new purchase, with transparent melting-loss terms.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-5">
              <p className="font-display text-lg">{item.title}</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    </StoreShell>
  );
}
