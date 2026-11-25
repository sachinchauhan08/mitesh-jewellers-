import type { Metadata } from "next";
import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, products } from "@/lib/db/schema";
import { getLatestRates } from "@/lib/rates";
import { storePricePaise } from "@/lib/store";
import { paise } from "@/lib/format";
import { StoreShell } from "@/components/store/store-shell";
import { AddToCart } from "@/components/store/add-to-cart";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Shop all jewellery",
  description: "Browse BIS-hallmarked gold, silver, platinum and diamond jewellery.",
};

const SORTS = [
  { value: "new", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "weight-desc", label: "Heaviest first" },
];

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    metal?: string;
    purity?: string;
    sort?: string;
  }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim();
  const metal = params.metal;
  const purity = params.purity;
  const sort = params.sort ?? "new";

  const [rates, categoryRows, rows] = await Promise.all([
    getLatestRates(),
    db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sortOrder)),
    db
      .select({ product: products, categoryName: categories.name, categorySlug: categories.slug })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(
        and(
          eq(products.status, "active"),
          sql`${products.stockQty} > 0`,
          q
            ? or(
                ilike(products.name, `%${q}%`),
                ilike(products.description, `%${q}%`),
                sql`${products.tags}::text ilike ${`%${q}%`}`,
              )
            : undefined,
          params.category ? eq(categories.slug, params.category) : undefined,
          metal && ["gold", "silver", "platinum", "other"].includes(metal)
            ? eq(products.metalType, metal as "gold" | "silver" | "platinum" | "other")
            : undefined,
          purity && purity !== "all" ? eq(products.purity, purity) : undefined,
        ),
      )
      .orderBy(asc(products.name))
      .limit(120),
  ]);

  const priced = rows.map((row) => ({ ...row, pricePaise: storePricePaise(row.product, rates) }));
  priced.sort((a, b) => {
    switch (sort) {
      case "price-asc":
        return a.pricePaise - b.pricePaise;
      case "price-desc":
        return b.pricePaise - a.pricePaise;
      case "weight-desc":
        return b.product.netWeightMg - a.product.netWeightMg;
      default:
        return b.product.id - a.product.id;
    }
  });

  const ticker = rates
    .filter((r) => r.metal === "gold" || r.metal === "silver")
    .slice(0, 4)
    .map((r) => ({ label: `${r.purity} ${r.metal}`, value: `${paise(r.ratePerGramPaise)}/g` }));

  const purities = [...new Set(rows.map((row) => row.product.purity))].sort();
  const metals = ["gold", "silver", "platinum", "other"];
  const activeCategory = categoryRows.find((c) => c.slug === params.category);

  return (
    <StoreShell rates={ticker}>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-gold-deep">
          The collection
        </p>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl">
          {activeCategory ? activeCategory.name : "All jewellery"}
        </h1>
        <p className="mt-2 text-xs text-muted-foreground">
          {priced.length} piece{priced.length === 1 ? "" : "s"} · prices include 3% GST and follow
          today&apos;s authorised rate
        </p>

        <form className="mt-5 flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card p-3">
          <div className="min-w-[180px] flex-1">
            <label htmlFor="shop-q" className="text-[11px] font-medium text-muted-foreground">
              Search
            </label>
            <Input
              id="shop-q"
              name="q"
              defaultValue={q}
              placeholder="Necklace, bangle, studs…"
              className="mt-1 h-9"
            />
          </div>
          <div>
            <label htmlFor="shop-category" className="text-[11px] font-medium text-muted-foreground">
              Collection
            </label>
            <select
              id="shop-category"
              name="category"
              defaultValue={params.category ?? ""}
              className="mt-1 block h-9 rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="">All collections</option>
              {categoryRows.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="shop-metal" className="text-[11px] font-medium text-muted-foreground">
              Metal
            </label>
            <select
              id="shop-metal"
              name="metal"
              defaultValue={metal ?? "all"}
              className="mt-1 block h-9 rounded-md border border-input bg-background px-2 text-xs capitalize"
            >
              <option value="all">All metals</option>
              {metals.map((m) => (
                <option key={m} value={m} className="capitalize">
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="shop-purity" className="text-[11px] font-medium text-muted-foreground">
              Purity
            </label>
            <select
              id="shop-purity"
              name="purity"
              defaultValue={purity ?? "all"}
              className="mt-1 block h-9 rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="all">All</option>
              {purities.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="shop-sort" className="text-[11px] font-medium text-muted-foreground">
              Sort
            </label>
            <select
              id="shop-sort"
              name="sort"
              defaultValue={sort}
              className="mt-1 block h-9 rounded-md border border-input bg-background px-2 text-xs"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" className="h-9">
            Apply
          </Button>
          {(q || params.category || metal || purity) && (
            <Button asChild variant="ghost" className="h-9">
              <Link href="/shop">Clear</Link>
            </Button>
          )}
        </form>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {priced.map(({ product, categoryName, pricePaise }) => (
            <div
              key={product.id}
              className="group overflow-hidden rounded-xl border border-border bg-card"
            >
              <Link href={`/shop/${product.slug}`} className="block aspect-square overflow-hidden bg-muted">
                {product.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : null}
              </Link>
              <div className="p-3">
                <p className="text-[10px] uppercase tracking-[0.1em] text-gold-deep">{categoryName}</p>
                <Link href={`/shop/${product.slug}`} className="mt-0.5 block truncate text-xs font-medium hover:underline">
                  {product.name}
                </Link>
                <p className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  {product.purity} · {(product.netWeightMg / 1000).toFixed(3)} g
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="tabular text-sm font-semibold">{paise(pricePaise)}</p>
                  <AddToCart
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
                </div>
              </div>
            </div>
          ))}
          {!priced.length ? (
            <div className="col-span-full rounded-xl border border-dashed border-border p-14 text-center">
              <p className="text-sm font-medium">Nothing matches those filters</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try a different collection, metal or purity — or clear the filters.
              </p>
              <Button asChild variant="outline" className="mt-4 h-9">
                <Link href="/shop">Clear filters</Link>
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </StoreShell>
  );
}
