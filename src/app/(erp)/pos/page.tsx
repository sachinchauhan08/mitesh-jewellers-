import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { branches, categories, customers, products, staffProfiles } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth-helpers";
import { getLatestRates } from "@/lib/rates";
import { PageHeader } from "@/components/erp/page-header";
import { PosClient } from "@/components/erp/pos-client";
import { Button } from "@/components/ui/button";
import { Coins, ReceiptText } from "lucide-react";

export const metadata = { title: "Billing counter" };

export default async function PosPage() {
  const session = await requireSession();
  const rates = await getLatestRates();

  const [productRows, customerRows, branchRows, profile] = await Promise.all([
    db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        barcode: products.barcode,
        categoryName: categories.name,
        metalType: products.metalType,
        purity: products.purity,
        grossWeightMg: products.grossWeightMg,
        netWeightMg: products.netWeightMg,
        makingChargeType: products.makingChargeType,
        makingChargeValue: products.makingChargeValue,
        wastageBp: products.wastageBp,
        stoneChargesPaise: products.stoneChargesPaise,
        sellingPricePaise: products.sellingPricePaise,
        stockQty: products.stockQty,
        images: products.images,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(eq(products.status, "active"), gt(products.stockQty, 0)))
      .orderBy(asc(products.name))
      .limit(300),
    db
      .select({
        id: customers.id,
        name: customers.name,
        mobile: customers.mobile,
        loyaltyPoints: customers.loyaltyPoints,
      })
      .from(customers)
      .where(eq(customers.isActive, true))
      .orderBy(asc(customers.name))
      .limit(500),
    db.select({ id: branches.id, name: branches.name }).from(branches).where(eq(branches.isActive, true)),
    db
      .select({ branchId: staffProfiles.branchId })
      .from(staffProfiles)
      .where(eq(staffProfiles.userId, session.user.id)),
  ]);

  if (!productRows.length) {
    redirect("/inventory");
  }

  return (
    <div className="pb-24 lg:pb-0">
      <PageHeader
        eyebrow="Counter"
        title="Billing counter"
        description="Scan, price at the live rate, take payment and print. Stock and the customer ledger update with the invoice."
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="h-9 bg-card">
              <Link href="/invoices">
                <ReceiptText className="mr-2 size-4" /> Invoices
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-9 bg-card">
              <Link href="/old-gold">
                <Coins className="mr-2 size-4" /> Old gold
              </Link>
            </Button>
          </>
        }
      />
      <PosClient
        products={productRows}
        customers={customerRows}
        rates={rates.map((rate) => ({
          metal: rate.metal,
          purity: rate.purity,
          ratePerGramPaise: rate.ratePerGramPaise,
        }))}
        branches={branchRows}
        initialBranchId={profile[0]?.branchId ?? branchRows[0]?.id}
      />
      <div className="mt-6 hidden items-center gap-2 text-xs text-muted-foreground lg:flex">
        <Coins className="size-3.5 text-gold-deep" />
        <span>
          22K gold {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format((rates.find((r) => r.metal === "gold" && r.purity === "22K")?.ratePerGramPaise ?? 0) / 100)}/g
          · Silver {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format((rates.find((r) => r.metal === "silver")?.ratePerGramPaise ?? 0) / 100)}/g
          · Prices include 3% GST
        </span>
      </div>
    </div>
  );
}
