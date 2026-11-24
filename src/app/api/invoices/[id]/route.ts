import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  branches,
  customers,
  payments,
  products,
  salesInvoices,
  salesItems,
  stockMovements,
} from "@/lib/db/schema";
import { apiGuard, handleRoute, jsonError, jsonOk, logActivity } from "@/lib/api-utils";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    const { response } = await apiGuard();
    if (response) return response;
    const { id } = await context.params;
    const [row] = await db
      .select({ invoice: salesInvoices, customer: customers, branch: branches })
      .from(salesInvoices)
      .leftJoin(customers, eq(salesInvoices.customerId, customers.id))
      .leftJoin(branches, eq(salesInvoices.branchId, branches.id))
      .where(eq(salesInvoices.id, Number(id)));
    if (!row) return jsonError("Invoice not found.", 404);
    const items = await db
      .select()
      .from(salesItems)
      .where(eq(salesItems.invoiceId, row.invoice.id));
    const paymentRows = await db
      .select()
      .from(payments)
      .where(eq(payments.invoiceId, row.invoice.id));
    return jsonOk({ ...row, items, payments: paymentRows });
  });
}

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    const { session, response } = await apiGuard("manager");
    if (response) return response;
    const { id } = await context.params;

    const [invoice] = await db
      .select()
      .from(salesInvoices)
      .where(eq(salesInvoices.id, Number(id)));
    if (!invoice) return jsonError("Invoice not found.", 404);
    if (invoice.status === "cancelled") return jsonError("This invoice is already cancelled.", 409);

    const items = await db
      .select()
      .from(salesItems)
      .where(eq(salesItems.invoiceId, invoice.id));

    await db.transaction(async (tx) => {
      for (const item of items) {
        if (!item.productId) continue;
        await tx
          .update(products)
          .set({ stockQty: sql`${products.stockQty} + ${item.qty}` })
          .where(eq(products.id, item.productId));
        await tx.insert(stockMovements).values({
          productId: item.productId,
          branchId: invoice.branchId,
          type: "return",
          qty: item.qty,
          weightMg: item.netWeightMg,
          referenceType: "invoice_cancel",
          referenceId: invoice.id,
          note: `Cancelled ${invoice.invoiceNo}`,
          createdBy: session.user.name,
        });
      }

      if (invoice.paidPaise > 0) {
        await tx.insert(payments).values({
          invoiceId: invoice.id,
          customerId: invoice.customerId,
          direction: "out",
          mode: invoice.paymentMode,
          amountPaise: invoice.paidPaise,
          notes: `Refund for cancelled ${invoice.invoiceNo}`,
          createdBy: session.user.name,
        });
      }

      if (invoice.customerId) {
        await tx
          .update(customers)
          .set({
            outstandingPaise: sql`greatest(${customers.outstandingPaise} - ${invoice.duePaise}, 0)`,
          })
          .where(eq(customers.id, invoice.customerId));
      }

      await tx
        .update(salesInvoices)
        .set({ status: "cancelled", duePaise: 0 })
        .where(eq(salesInvoices.id, invoice.id));
    });

    await logActivity(session, "invoice.cancelled", "invoice", invoice.id, invoice.invoiceNo);
    return jsonOk({ ok: true });
  });
}
