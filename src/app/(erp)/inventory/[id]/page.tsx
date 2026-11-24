import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { ArrowLeft, Gem } from "lucide-react";
import { db } from "@/lib/db";
import {
  branches,
  categories,
  products,
  salesItems,
  stockMovements,
} from "@/lib/db/schema";
import { canManage, requireSession } from "@/lib/auth-helpers";
import { getLatestRates } from "@/lib/rates";
import { calculateItem, DEFAULT_GST_BP } from "@/lib/pricing";
import { formatDateTime, grams, paise, titleCase } from "@/lib/format";
import { PageHeader, StatusBadge } from "@/components/erp/page-header";
import { InventoryDetailActions } from "@/components/erp/inventory-detail-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const metadata = { title: "Product" };

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  if (!canManage(session.user.role)) redirect("/dashboard");
  const { id } = await params;

  const [row] = await db
    .select({
      product: products,
      categoryName: categories.name,
      branchName: branches.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(branches, eq(products.branchId, branches.id))
    .where(eq(products.id, Number(id)));

  if (!row) notFound();
  const product = row.product;

  const [movements, sales, rates] = await Promise.all([
    db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.productId, product.id))
      .orderBy(desc(stockMovements.createdAt))
      .limit(12),
    db
      .select({
        description: salesItems.description,
        qty: salesItems.qty,
        totalPaise: salesItems.totalPaise,
        invoiceId: salesItems.invoiceId,
      })
      .from(salesItems)
      .where(eq(salesItems.productId, product.id))
      .orderBy(desc(salesItems.id))
      .limit(8),
    getLatestRates(),
  ]);

  const rate = rates.find((r) => r.metal === product.metalType && r.purity === product.purity);
  const priced = calculateItem({
    netWeightMg: product.netWeightMg,
    qty: 1,
    ratePerGramPaise: rate?.ratePerGramPaise ?? 0,
    makingChargeType: product.makingChargeType,
    makingChargeValue: product.makingChargeValue,
    wastageBp: product.wastageBp,
    stoneChargesPaise: product.stoneChargesPaise,
    gstRateBp: DEFAULT_GST_BP,
  });

  return (
    <div>
      <Link
        href="/inventory"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Back to inventory
      </Link>
      <PageHeader
        eyebrow={product.sku}
        title={product.name}
        description={`${product.purity} ${titleCase(product.metalType)} · ${row.categoryName ?? "Uncategorised"} · ${row.branchName ?? "All showrooms"}`}
        actions={<InventoryDetailActions product={product} />}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <div className="grid gap-4 p-4 sm:grid-cols-[1.2fr_1fr]">
            <div className="space-y-2">
              <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                {product.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <Gem className="size-10 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {product.images.slice(1, 4).map((image) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={image}
                    src={image}
                    alt=""
                    className="size-16 rounded-md object-cover"
                  />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <StatusBadge status={product.status} />
                {product.isFeatured ? (
                  <Badge variant="outline" className="rounded-full border-gold/40 text-[10px] text-gold-deep">
                    Featured
                  </Badge>
                ) : null}
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Selling price
                </p>
                <p className="tabular font-display text-4xl">{paise(product.sellingPricePaise)}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Incl. 3% GST · rate {paise(rate?.ratePerGramPaise)}/g
                </p>
              </div>
              <Separator />
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                {[
                  ["Gross weight", grams(product.grossWeightMg)],
                  ["Net weight", grams(product.netWeightMg)],
                  ["Stone weight", grams(product.stoneWeightMg)],
                  ["Diamond weight", grams(product.diamondWeightMg)],
                  ["HUID", product.huid ?? "—"],
                  ["Barcode", product.barcode],
                  ["Stock", `${product.stockQty} pcs`],
                  ["Reorder level", `${product.minStockQty} pcs`],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="tabular mt-0.5 font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <div className="border-t border-border px-5 py-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {product.description ?? "No description added yet."}
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Price build-up</CardTitle>
            <p className="text-xs text-muted-foreground">At the current authorised rate</p>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm">
            {[
              ["Metal value", priced.metalValuePaise],
              ["Making charges", priced.makingPaise],
              ["Wastage", priced.wastagePaise],
              ["Stone charges", priced.stonePaise],
              ["GST 3%", priced.gstPaise],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex justify-between text-muted-foreground">
                <span>{label}</span>
                <span className="tabular text-foreground">{paise(Number(value))}</span>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between font-medium">
              <span>Total</span>
              <span className="tabular">{paise(priced.totalPaise)}</span>
            </div>
            <div className="mt-4 space-y-1 rounded-md bg-muted/60 p-3 text-xs">
              <p className="flex justify-between">
                <span className="text-muted-foreground">Making</span>
                <span className="capitalize">{product.makingChargeType.replace("_", " ")}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Wastage</span>
                <span>{(product.wastageBp / 100).toFixed(2)}%</span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Purchase price</span>
                <span className="tabular">{paise(product.purchasePricePaise)}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Inventory history</CardTitle>
            <p className="text-xs text-muted-foreground">Opening stock, sales and adjustments</p>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">Date</th>
                  <th className="px-3 py-2.5 font-medium">Type</th>
                  <th className="px-3 py-2.5 text-right font-medium">Qty</th>
                  <th className="px-5 py-2.5 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr key={movement.id} className="border-b border-border/60 last:border-0">
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {formatDateTime(movement.createdAt)}
                    </td>
                    <td className="px-3 py-3 capitalize text-xs">
                      {movement.type.replace(/_/g, " ")}
                    </td>
                    <td className={`tabular px-3 py-3 text-right ${movement.qty < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                      {movement.qty > 0 ? "+" : ""}
                      {movement.qty}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {movement.note ?? movement.createdBy ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent sales</CardTitle>
            <p className="text-xs text-muted-foreground">Invoices that included this piece</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {sales.map((sale) => (
              <div key={`${sale.invoiceId}-${sale.totalPaise}`} className="flex items-center justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <Link href={`/invoices/${sale.invoiceId}`} className="text-sm hover:underline">
                    {sale.description}
                  </Link>
                  <p className="text-[11px] text-muted-foreground">Qty {sale.qty}</p>
                </div>
                <span className="tabular text-sm">{paise(sale.totalPaise)}</span>
              </div>
            ))}
            {!sales.length ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                This piece has not been sold yet.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
