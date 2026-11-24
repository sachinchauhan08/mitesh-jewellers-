import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  branches,
  customers,
  payments,
  salesInvoices,
  salesItems,
  settings,
} from "@/lib/db/schema";

export async function getInvoiceDetail(id: number) {
  const [row] = await db
    .select({
      invoice: salesInvoices,
      customer: customers,
      branch: branches,
    })
    .from(salesInvoices)
    .leftJoin(customers, eq(salesInvoices.customerId, customers.id))
    .leftJoin(branches, eq(salesInvoices.branchId, branches.id))
    .where(eq(salesInvoices.id, id));

  if (!row) return null;

  const [items, paymentRows, settingRows] = await Promise.all([
    db.select().from(salesItems).where(eq(salesItems.invoiceId, id)),
    db.select().from(payments).where(eq(payments.invoiceId, id)),
    db.select().from(settings),
  ]);

  const settingMap = Object.fromEntries(settingRows.map((s) => [s.key, s.value]));

  return { ...row, items, payments: paymentRows, settings: settingMap };
}

export type InvoiceDetail = NonNullable<Awaited<ReturnType<typeof getInvoiceDetail>>>;
