import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  payments,
  products,
  purchaseItems,
  purchases,
  stockMovements,
  suppliers,
} from "@/lib/db/schema";
import { apiGuard, handleRoute, jsonOk, logActivity, readJson } from "@/lib/api-utils";
import { nextDocumentNumber } from "@/lib/documents";

const purchaseSchema = z.object({
  supplierId: z.coerce.number().int().positive(),
  branchId: z.coerce.number().int().positive().optional(),
  type: z.enum(["raw_gold", "finished", "old_gold"]).default("finished"),
  purchaseDate: z.string().optional(),
  paidAmount: z.coerce.number().min(0).default(0),
  notes: z.string().max(500).optional(),
  items: z
    .array(
      z.object({
        productId: z.coerce.number().int().positive().optional(),
        description: z.string().min(2).max(200),
        metalType: z.enum(["gold", "silver", "platinum", "other"]).default("gold"),
        purity: z.string().max(10).default("22K"),
        weightG: z.coerce.number().min(0),
        ratePerGram: z.coerce.number().min(0),
        qty: z.coerce.number().int().positive().default(1),
      }),
    )
    .min(1, "Add at least one purchase line."),
});

export async function GET(request: Request) {
  return handleRoute(async () => {
    const { response } = await apiGuard("accountant");
    if (response) return response;
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim();
    const type = url.searchParams.get("type");

    const filters = [
      q
        ? or(ilike(purchases.purchaseNo, `%${q}%`), ilike(suppliers.name, `%${q}%`))
        : undefined,
      type && type !== "all" ? eq(purchases.type, type as "finished") : undefined,
    ].filter(Boolean);

    const rows = await db
      .select({ purchase: purchases, supplierName: suppliers.name })
      .from(purchases)
      .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(purchases.purchaseDate))
      .limit(100);
    return jsonOk({ purchases: rows });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const { session, response } = await apiGuard("manager");
    if (response) return response;

    const { data, error } = await readJson(request, purchaseSchema);
    if (error) return error;

    const lines = data.items.map((line) => ({
      ...line,
      weightMg: Math.round(line.weightG * 1000),
      ratePerGramPaise: Math.round(line.ratePerGram * 100),
      amountPaise: Math.round(line.weightG * line.ratePerGram * 100),
    }));

    const subtotal = lines.reduce((sum, line) => sum + line.amountPaise, 0);
    const gst = Math.round(subtotal * 0.03);
    const total = subtotal + gst;
    const paid = Math.min(Math.round(data.paidAmount * 100), total);
    const due = total - paid;
    const status = due === 0 ? "paid" : paid > 0 ? "partial" : "unpaid";

    const purchase = await db.transaction(async (tx) => {
      const purchaseNo = await nextDocumentNumber(tx, "purchase", "PUR");
      const [created] = await tx
        .insert(purchases)
        .values({
          purchaseNo,
          supplierId: data.supplierId,
          branchId: data.branchId,
          type: data.type,
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : new Date(),
          subtotalPaise: subtotal,
          gstPaise: gst,
          totalPaise: total,
          paidPaise: paid,
          duePaise: due,
          status,
          notes: data.notes,
          createdBy: session.user.name,
        })
        .returning();

      await tx.insert(purchaseItems).values(
        lines.map((line) => ({
          purchaseId: created.id,
          productId: line.productId,
          description: line.description,
          metalType: line.metalType,
          purity: line.purity,
          qty: line.qty,
          weightMg: line.weightMg,
          ratePerGramPaise: line.ratePerGramPaise,
          amountPaise: line.amountPaise,
        })),
      );

      if (paid > 0) {
        await tx.insert(payments).values({
          purchaseId: created.id,
          supplierId: data.supplierId,
          direction: "out",
          mode: "bank",
          amountPaise: paid,
          notes: `Payment for ${purchaseNo}`,
          createdBy: session.user.name,
        });
      }

      if (due > 0) {
        await tx
          .update(suppliers)
          .set({ outstandingPaise: sql`${suppliers.outstandingPaise} + ${due}` })
          .where(eq(suppliers.id, data.supplierId));
      }

      for (const line of lines) {
        if (!line.productId) continue;
        await tx
          .update(products)
          .set({ stockQty: sql`${products.stockQty} + ${line.qty}` })
          .where(eq(products.id, line.productId));
        await tx.insert(stockMovements).values({
          productId: line.productId,
          branchId: data.branchId,
          type: "purchase",
          qty: line.qty,
          weightMg: line.weightMg,
          referenceType: "purchase",
          referenceId: created.id,
          note: `Received on ${purchaseNo}`,
          createdBy: session.user.name,
        });
      }

      return created;
    });

    await logActivity(session, "purchase.created", "purchase", purchase.id, purchase.purchaseNo);
    return jsonOk({ purchase }, 201);
  });
}
