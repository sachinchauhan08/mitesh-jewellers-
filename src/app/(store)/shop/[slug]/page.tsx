import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { and, eq, ne } from "drizzle-orm";
import { BadgeCheck, Gem, PackageCheck, RefreshCcw, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { categories, products } from "@/lib/db/schema";
import { getLatestRates } from "@/lib/rates";
import { ratePerGramFor, storePricePaise } from "@/lib/store";
import { calculateItem, DEFAULT_GST_BP } from "@/lib/pricing";
import { grams, paise } from "@/lib/format";
import { StoreShell } from "@/components/store/store-shell";
import { AddToCart } from "@/components/store/add-to-cart";

export const metadata: Metadata = { title: "Jewellery" };

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [row] = await db
    .select({ product: products, categoryName: categories.name, categorySlug: categories.slug })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.slug, slug))
    .limit(1);

  if (!row || row.product.status !== "active") notFound();

  const rates = await getLatestRates();
  const product = row.product;
  const rate = ratePerGramFor(rates, product.metalType, product.purity);
  const breakdown = calculateItem({
    netWeightMg: product.netWeightMg,
    qty: 1,
    ratePerGramPaise: rate,
    makingChargeType: product.makingChargeType,
    makingChargeValue: product.makingChargeValue,
    wastageBp: product.wastageBp,
    stoneChargesPaise: product.stoneChargesPaise,
    gstRateBp: DEFAULT_GST_BP,
  });
  const pricePaise = storePricePaise(product, rates);

  const related = await db
    .select({ product: products })
    .from(products)
    .where(
      and(
        eq(products.categoryId, product.categoryId),
        ne(products.id, product.id),
        eq(products.status, "active"),
      ),
    )
    .limit(4);

  const ticker = rates
    .filter((r) => r.metal === "gold" || r.metal === "silver")
    .slice(0, 4)
    .map((r) => ({ label: `${r.purity} ${r.metal}`, value: `${paise(r.ratePerGramPaise)}/g` }));

  const specs = [
    { label: "Metal", value: `${product.metalType} · ${product.purity}` },
    { label: "Gross weight", value: grams(product.grossWeightMg) },
    { label: "Net weight", value: grams(product.netWeightMg) },
    product.stoneWeightMg > 0
      ? { label: "Stone weight", value: grams(product.stoneWeightMg) }
      : null,
    product.diamondWeightMg > 0
      ? { label: "Diamond weight", value: grams(product.diamondWeightMg) }
      : null,
    { label: "HUID", value: product.huid ?? "Applied at billing" },
    { label: "SKU", value: product.sku },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <StoreShell rates={ticker}>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <nav className="text-[11px] text-muted-foreground" aria-label="Breadcrumb">
          <Link href="/shop" className="hover:text-foreground">Shop</Link>
          <span className="mx-1.5">/</span>
          <Link href={`/shop?category=${row.categorySlug}`} className="hover:text-foreground">
            {row.categoryName}
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="mt-5 grid gap-8 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="aspect-square overflow-hidden rounded-2xl border border-border bg-muted">
              {product.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.images[0]} alt={product.name} className="size-full object-cover" />
              ) : null}
            </div>
            {product.images.length > 1 ? (
              <div className="grid grid-cols-3 gap-3">
                {product.images.slice(1, 4).map((image) => (
                  <div key={image} className="aspect-square overflow-hidden rounded-xl border border-border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image} alt={product.name} className="size-full object-cover" />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-gold-deep">
              {row.categoryName}
            </p>
            <h1 className="mt-2 font-display text-3xl leading-tight sm:text-4xl">{product.name}</h1>
            <p className="mt-2 text-xs text-muted-foreground">
              {product.purity} {product.metalType} · {grams(product.netWeightMg)} net
            </p>

            <p className="tabular mt-5 text-3xl font-semibold">{paise(pricePaise)}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Inclusive of 3% GST · rate {paise(rate)}/g
            </p>

            {product.description ? (
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{product.description}</p>
            ) : null}

            <div className="mt-5">
              <AddToCart
                variant="full"
                disabled={product.stockQty <= 0}
                line={{
                  productId: product.id,
                  slug: product.slug,
                  name: product.name,
                  image: product.images[0] ?? null,
                  purity: product.purity,
                  metal: product.metalType,
                  netWeightMg: product.netWeightMg,
                  pricePaise,
                }}
              />
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                {product.stockQty > 0
                  ? `${product.stockQty} in stock · reserve and collect at any showroom`
                  : "Currently out of stock — call a showroom for the next batch"}
              </p>
            </div>

            <div className="mt-6 rounded-xl border border-border bg-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Price breakdown
              </p>
              <dl className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Metal value</dt>
                  <dd className="tabular">{paise(breakdown.metalValuePaise)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Making charges</dt>
                  <dd className="tabular">{paise(breakdown.makingPaise)}</dd>
                </div>
                {breakdown.wastagePaise > 0 ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Wastage</dt>
                    <dd className="tabular">{paise(breakdown.wastagePaise)}</dd>
                  </div>
                ) : null}
                {breakdown.stonePaise > 0 ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Stones</dt>
                    <dd className="tabular">{paise(breakdown.stonePaise)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">GST (3%)</dt>
                  <dd className="tabular">{paise(breakdown.gstPaise)}</dd>
                </div>
                <div className="flex justify-between gap-3 border-t border-border pt-2 text-sm font-semibold">
                  <dt>Total</dt>
                  <dd className="tabular">{paise(breakdown.totalPaise)}</dd>
                </div>
              </dl>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-[11px] text-muted-foreground">
              <p className="flex items-center gap-2"><BadgeCheck className="size-4 text-gold-deep" /> BIS hallmarked</p>
              <p className="flex items-center gap-2"><ShieldCheck className="size-4 text-gold-deep" /> HUID on every piece</p>
              <p className="flex items-center gap-2"><RefreshCcw className="size-4 text-gold-deep" /> Lifetime exchange</p>
              <p className="flex items-center gap-2"><PackageCheck className="size-4 text-gold-deep" /> Insured pickup</p>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 font-display text-xl">
              <Gem className="size-4 text-gold-deep" /> Specification
            </h2>
            <dl className="mt-4 grid gap-x-8 gap-y-2 text-xs sm:grid-cols-2">
              {specs.map((spec) => (
                <div key={spec.label} className="flex justify-between gap-3 border-b border-border/60 py-1.5">
                  <dt className="text-muted-foreground">{spec.label}</dt>
                  <dd className="text-right font-medium capitalize">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="rounded-xl border border-gold/30 bg-gold-soft/50 p-5 text-xs leading-relaxed text-muted-foreground">
            <p className="font-display text-lg text-foreground">Made to be worn daily</p>
            <p className="mt-2">
              Gold purity is verified at intake and again before billing. If you need a size
              adjustment, our workshop can resize rings and bangles — usually within three working
              days.
            </p>
          </div>
        </div>

        {related.length ? (
          <section className="mt-12">
            <h2 className="font-display text-2xl">You may also like</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {related.map(({ product: item }) => (
                <Link
                  key={item.id}
                  href={`/shop/${item.slug}`}
                  className="group overflow-hidden rounded-xl border border-border bg-card"
                >
                  <div className="aspect-square overflow-hidden bg-muted">
                    {item.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.images[0]}
                        alt={item.name}
                        className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : null}
                  </div>
                  <div className="p-3">
                    <p className="truncate text-xs font-medium">{item.name}</p>
                    <p className="tabular mt-1 text-xs text-muted-foreground">
                      {paise(storePricePaise(item, rates))}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </StoreShell>
  );
}
