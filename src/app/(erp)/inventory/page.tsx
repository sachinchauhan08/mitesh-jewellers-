import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { branches, categories, products } from "@/lib/db/schema";
import { canManage, requireSession } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/erp/page-header";
import { InventoryClient } from "@/components/erp/inventory-client";

export const metadata = { title: "Inventory" };

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; low?: string }>;
}) {
  const session = await requireSession();
  if (!canManage(session.user.role)) redirect("/dashboard");
  const params = await searchParams;

  const [rows, categoryRows, branchRows] = await Promise.all([
    db
      .select({
        id: products.id,
        sku: products.sku,
        barcode: products.barcode,
        name: products.name,
        slug: products.slug,
        description: products.description,
        categoryId: products.categoryId,
        branchId: products.branchId,
        metalType: products.metalType,
        purity: products.purity,
        grossWeightMg: products.grossWeightMg,
        netWeightMg: products.netWeightMg,
        stoneWeightMg: products.stoneWeightMg,
        diamondWeightMg: products.diamondWeightMg,
        makingChargeType: products.makingChargeType,
        makingChargeValue: products.makingChargeValue,
        wastageBp: products.wastageBp,
        stoneChargesPaise: products.stoneChargesPaise,
        huid: products.huid,
        purchasePricePaise: products.purchasePricePaise,
        sellingPricePaise: products.sellingPricePaise,
        stockQty: products.stockQty,
        minStockQty: products.minStockQty,
        status: products.status,
        images: products.images,
        isFeatured: products.isFeatured,
        categoryName: categories.name,
        categorySlug: categories.slug,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .orderBy(desc(products.createdAt)),
    db.select({ id: categories.id, name: categories.name, slug: categories.slug }).from(categories).orderBy(categories.name),
    db.select({ id: branches.id, name: branches.name }).from(branches).orderBy(branches.name),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Catalogue"
        title="Jewellery inventory"
        description="Every piece with hallmark, weights, making charges and live stock across showrooms."
      />
      <InventoryClient
        products={rows}
        categories={categoryRows}
        branches={branchRows}
        initialFilters={{
          q: params.q,
          category: params.category,
          low: params.low === "1",
        }}
      />
    </div>
  );
}
