import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { products, stockMovements } from "@/lib/db/schema";
import { apiGuard, handleRoute, jsonError, jsonOk, logActivity, readJson } from "@/lib/api-utils";

const adjustSchema = z.object({
  qtyChange: z.coerce.number().int().refine((v) => v !== 0, "Enter a non-zero quantity."),
  type: z.enum(["adjustment", "transfer_in", "transfer_out", "return", "purchase"]).default("adjustment"),
  note: z.string().max(300).optional(),
  branchId: z.coerce.number().int().positive().optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    const { session, response } = await apiGuard("manager");
    if (response) return response;
    const { id } = await context.params;
    const { data, error } = await readJson(request, adjustSchema);
    if (error) return error;

    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, Number(id)));
    if (!product) return jsonError("Product not found.", 404);
    if (product.stockQty + data.qtyChange < 0) {
      return jsonError("This adjustment would take stock below zero.", 422);
    }

    const [updated] = await db
      .update(products)
      .set({
        stockQty: sql`${products.stockQty} + ${data.qtyChange}`,
        updatedAt: new Date(),
      })
      .where(eq(products.id, product.id))
      .returning();

    await db.insert(stockMovements).values({
      productId: product.id,
      branchId: data.branchId ?? product.branchId,
      type: data.type,
      qty: data.qtyChange,
      weightMg: product.netWeightMg * data.qtyChange,
      referenceType: "manual",
      note: data.note,
      createdBy: session.user.name,
    });

    await logActivity(
      session,
      "stock.adjusted",
      "product",
      product.id,
      `${data.qtyChange > 0 ? "+" : ""}${data.qtyChange} units · ${data.note ?? "manual adjustment"}`,
    );

    return jsonOk({ product: updated });
  });
}
