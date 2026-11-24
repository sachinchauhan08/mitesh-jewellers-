import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { apiGuard, handleRoute, jsonError, jsonOk, logActivity, readJson } from "@/lib/api-utils";
import { percentToBp } from "@/lib/format";

const updateSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  branchId: z.coerce.number().int().positive().nullable().optional(),
  metalType: z.enum(["gold", "silver", "platinum", "other"]).optional(),
  purity: z.string().max(10).optional(),
  grossWeightG: z.coerce.number().min(0).optional(),
  netWeightG: z.coerce.number().min(0).optional(),
  stoneWeightG: z.coerce.number().min(0).optional(),
  diamondWeightG: z.coerce.number().min(0).optional(),
  makingChargeType: z.enum(["per_gram", "per_piece", "percent"]).optional(),
  makingChargeValue: z.coerce.number().min(0).optional(),
  wastagePercent: z.coerce.number().min(0).max(100).optional(),
  stoneCharges: z.coerce.number().min(0).optional(),
  huid: z.string().max(30).nullable().optional(),
  purchasePrice: z.coerce.number().min(0).optional(),
  sellingPrice: z.coerce.number().min(0).optional(),
  minStockQty: z.coerce.number().int().min(0).optional(),
  status: z.enum(["active", "draft", "archived"]).optional(),
  images: z.array(z.string()).optional(),
  isFeatured: z.boolean().optional(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    const { response } = await apiGuard();
    if (response) return response;
    const { id } = await context.params;
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, Number(id)));
    if (!product) return jsonError("Product not found.", 404);
    return jsonOk({ product });
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    const { session, response } = await apiGuard("manager");
    if (response) return response;
    const { id } = await context.params;
    const { data, error } = await readJson(request, updateSchema);
    if (error) return error;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.categoryId !== undefined) updates.categoryId = data.categoryId;
    if (data.branchId !== undefined) updates.branchId = data.branchId;
    if (data.metalType !== undefined) updates.metalType = data.metalType;
    if (data.purity !== undefined) updates.purity = data.purity;
    if (data.grossWeightG !== undefined) updates.grossWeightMg = Math.round(data.grossWeightG * 1000);
    if (data.netWeightG !== undefined) updates.netWeightMg = Math.round(data.netWeightG * 1000);
    if (data.stoneWeightG !== undefined) updates.stoneWeightMg = Math.round(data.stoneWeightG * 1000);
    if (data.diamondWeightG !== undefined) updates.diamondWeightMg = Math.round(data.diamondWeightG * 1000);
    if (data.makingChargeType !== undefined) updates.makingChargeType = data.makingChargeType;
    if (data.makingChargeValue !== undefined)
      updates.makingChargeValue =
        data.makingChargeType === "percent"
          ? percentToBp(data.makingChargeValue)
          : Math.round(data.makingChargeValue * 100);
    if (data.wastagePercent !== undefined) updates.wastageBp = percentToBp(data.wastagePercent);
    if (data.stoneCharges !== undefined) updates.stoneChargesPaise = Math.round(data.stoneCharges * 100);
    if (data.huid !== undefined) updates.huid = data.huid;
    if (data.purchasePrice !== undefined) updates.purchasePricePaise = Math.round(data.purchasePrice * 100);
    if (data.sellingPrice !== undefined) updates.sellingPricePaise = Math.round(data.sellingPrice * 100);
    if (data.minStockQty !== undefined) updates.minStockQty = data.minStockQty;
    if (data.status !== undefined) updates.status = data.status;
    if (data.images !== undefined) updates.images = data.images;
    if (data.isFeatured !== undefined) updates.isFeatured = data.isFeatured;

    const [product] = await db
      .update(products)
      .set(updates)
      .where(eq(products.id, Number(id)))
      .returning();
    if (!product) return jsonError("Product not found.", 404);

    await logActivity(session, "product.updated", "product", product.id, product.name);
    return jsonOk({ product });
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    const { session, response } = await apiGuard("manager");
    if (response) return response;
    const { id } = await context.params;
    const [product] = await db
      .update(products)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(products.id, Number(id)))
      .returning();
    if (!product) return jsonError("Product not found.", 404);
    await logActivity(session, "product.archived", "product", product.id, product.name);
    return jsonOk({ product });
  });
}
