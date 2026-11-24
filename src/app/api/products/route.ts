import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { categories, products, stockMovements } from "@/lib/db/schema";
import { apiGuard, handleRoute, jsonOk, logActivity, readJson } from "@/lib/api-utils";
import { getRatePerGram } from "@/lib/rates";
import { calculateItem } from "@/lib/pricing";
import { percentToBp } from "@/lib/format";

const productSchema = z.object({
  name: z.string().min(2).max(200),
  sku: z.string().max(40).optional(),
  barcode: z.string().max(60).optional(),
  description: z.string().max(2000).optional(),
  categoryId: z.coerce.number().int().positive(),
  branchId: z.coerce.number().int().positive().optional(),
  metalType: z.enum(["gold", "silver", "platinum", "other"]),
  purity: z.string().min(1).max(10),
  grossWeightG: z.coerce.number().min(0),
  netWeightG: z.coerce.number().min(0),
  stoneWeightG: z.coerce.number().min(0).default(0),
  diamondWeightG: z.coerce.number().min(0).default(0),
  makingChargeType: z.enum(["per_gram", "per_piece", "percent"]),
  makingChargeValue: z.coerce.number().min(0),
  wastagePercent: z.coerce.number().min(0).max(100).default(0),
  stoneCharges: z.coerce.number().min(0).default(0),
  huid: z.string().max(30).optional(),
  purchasePrice: z.coerce.number().min(0).default(0),
  sellingPrice: z.coerce.number().min(0).default(0),
  stockQty: z.coerce.number().int().min(0).default(0),
  minStockQty: z.coerce.number().int().min(0).default(1),
  status: z.enum(["active", "draft", "archived"]).default("active"),
  images: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  isFeatured: z.boolean().default(false),
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function makingChargeToStore(type: string, value: number) {
  if (type === "percent") return percentToBp(value);
  return Math.round(value * 100);
}

export async function GET(request: Request) {
  return handleRoute(async () => {
    const { response } = await apiGuard();
    if (response) return response;

    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim();
    const category = url.searchParams.get("category");
    const status = url.searchParams.get("status");
    const metal = url.searchParams.get("metal");
    const low = url.searchParams.get("low") === "1";

    const filters = [
      q
        ? or(
            ilike(products.name, `%${q}%`),
            ilike(products.sku, `%${q}%`),
            ilike(products.barcode, `%${q}%`),
          )
        : undefined,
      status && status !== "all" ? eq(products.status, status as "active") : undefined,
      metal && metal !== "all" ? eq(products.metalType, metal as "gold") : undefined,
      category && category !== "all" ? eq(categories.slug, category) : undefined,
      low ? sql`${products.stockQty} <= ${products.minStockQty}` : undefined,
    ].filter(Boolean);

    const rows = await db
      .select({
        id: products.id,
        sku: products.sku,
        barcode: products.barcode,
        name: products.name,
        slug: products.slug,
        metalType: products.metalType,
        purity: products.purity,
        grossWeightMg: products.grossWeightMg,
        netWeightMg: products.netWeightMg,
        makingChargeType: products.makingChargeType,
        makingChargeValue: products.makingChargeValue,
        wastageBp: products.wastageBp,
        stoneChargesPaise: products.stoneChargesPaise,
        purchasePricePaise: products.purchasePricePaise,
        sellingPricePaise: products.sellingPricePaise,
        stockQty: products.stockQty,
        minStockQty: products.minStockQty,
        status: products.status,
        images: products.images,
        isFeatured: products.isFeatured,
        categoryId: products.categoryId,
        categoryName: categories.name,
        categorySlug: categories.slug,
        branchId: products.branchId,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(products.createdAt))
      .limit(250);

    return jsonOk({ products: rows });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const { session, response } = await apiGuard("manager");
    if (response) return response;

    const { data, error } = await readJson(request, productSchema);
    if (error) return error;

    const rate = await getRatePerGram(data.metalType, data.purity);
    const priced = calculateItem({
      netWeightMg: Math.round(data.netWeightG * 1000),
      qty: 1,
      ratePerGramPaise: rate,
      makingChargeType: data.makingChargeType,
      makingChargeValue: makingChargeToStore(data.makingChargeType, data.makingChargeValue),
      wastageBp: percentToBp(data.wastagePercent),
      stoneChargesPaise: Math.round(data.stoneCharges * 100),
      gstRateBp: 300,
    });

    const sellingPaise =
      data.sellingPrice > 0
        ? Math.round(data.sellingPrice * 100)
        : Math.round(priced.totalPaise || data.purchasePrice * 120);

    const count = await db.select({ id: products.id }).from(products);
    const sequence = count.length + 1;
    const sku = data.sku?.trim() || `AJ-${String(sequence).padStart(4, "0")}`;
    const barcode = data.barcode?.trim() || `8901${String(Date.now()).slice(-9)}`;

    const [product] = await db
      .insert(products)
      .values({
        name: data.name,
        sku,
        barcode,
        slug: `${slugify(data.name)}-${sequence}`,
        description: data.description,
        categoryId: data.categoryId,
        branchId: data.branchId,
        metalType: data.metalType,
        purity: data.purity,
        grossWeightMg: Math.round(data.grossWeightG * 1000),
        netWeightMg: Math.round(data.netWeightG * 1000),
        stoneWeightMg: Math.round(data.stoneWeightG * 1000),
        diamondWeightMg: Math.round(data.diamondWeightG * 1000),
        makingChargeType: data.makingChargeType,
        makingChargeValue: makingChargeToStore(data.makingChargeType, data.makingChargeValue),
        wastageBp: percentToBp(data.wastagePercent),
        stoneChargesPaise: Math.round(data.stoneCharges * 100),
        huid: data.huid,
        purchasePricePaise: Math.round(data.purchasePrice * 100),
        sellingPricePaise: sellingPaise,
        stockQty: data.stockQty,
        minStockQty: data.minStockQty,
        status: data.status,
        images: data.images,
        tags: data.tags,
        isFeatured: data.isFeatured,
      })
      .returning();

    if (data.stockQty > 0) {
      await db.insert(stockMovements).values({
        productId: product.id,
        branchId: data.branchId,
        type: "opening",
        qty: data.stockQty,
        weightMg: product.netWeightMg * data.stockQty,
        referenceType: "product",
        referenceId: product.id,
        note: "Opening stock on product creation",
        createdBy: session.user.name,
      });
    }

    await logActivity(session, "product.created", "product", product.id, product.name);
    return jsonOk({ product }, 201);
  });
}

export const dynamic = "force-dynamic";
