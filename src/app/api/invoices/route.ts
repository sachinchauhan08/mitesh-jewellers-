import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  customers,
  payments,
  products,
  salesInvoices,
  salesItems,
  stockMovements,
} from "@/lib/db/schema";
import {
  apiGuard,
  handleRoute,
  jsonError,
  jsonOk,
  logActivity,
  readJson,
  toNumber,
} from "@/lib/api-utils";
import { nextDocumentNumber } from "@/lib/documents";
import { getLatestRates } from "@/lib/rates";
import { calculateInvoiceTotals, calculateItem, DEFAULT_GST_BP } from "@/lib/pricing";

const invoiceSchema = z.object({
  customerId: z.coerce.number().int().positive().nullable().optional(),
  customerName: z.string().max(160).optional(),
  customerMobile: z.string().max(15).optional(),
  branchId: z.coerce.number().int().positive().optional(),
  items: z
    .array(
      z.object({
        productId: z.coerce.number().int().positive(),
        qty: z.coerce.number().int().positive().default(1),
      }),
    )
    .min(1, "Add at least one product to the invoice."),
  discount: z.coerce.number().min(0).default(0),
  oldGoldValue: z.coerce.number().min(0).default(0),
  paymentMode: z.enum(["cash", "upi", "card", "bank", "cheque", "advance"]).default("cash"),
  paidAmount: z.coerce.number().min(0).default(0),
  notes: z.string().max(500).optional(),
  channel: z.enum(["pos", "online"]).default("pos"),
});

export async function GET(request: Request) {
  return handleRoute(async () => {
    const { response } = await apiGuard();
    if (response) return response;
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim();
    const status = url.searchParams.get("status");
    const branchId = url.searchParams.get("branch");

    const filters = [
      q
        ? or(ilike(salesInvoices.invoiceNo, `%${q}%`), ilike(customers.name, `%${q}%`))
        : undefined,
      status && status !== "all"
        ? eq(salesInvoices.status, status as "paid")
        : undefined,
      branchId && branchId !== "all"
        ? eq(salesInvoices.branchId, Number(branchId))
        : undefined,
    ].filter(Boolean);

    const rows = await db
      .select({
        invoice: salesInvoices,
        customerName: customers.name,
        customerMobile: customers.mobile,
      })
      .from(salesInvoices)
      .leftJoin(customers, eq(salesInvoices.customerId, customers.id))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(salesInvoices.invoiceDate))
      .limit(100);

    return jsonOk({ invoices: rows });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const { session, response } = await apiGuard("cashier");
    if (response) return response;

    const { data, error } = await readJson(request, invoiceSchema);
    if (error) return error;

    const rates = await getLatestRates();
    const ids = [...new Set(data.items.map((item) => item.productId))];
    const productRows = await db
      .select()
      .from(products)
      .where(sql`${products.id} = ANY(${sql.raw(`ARRAY[${ids.join(",")}]`)})`);

    if (productRows.length !== ids.length) {
      return jsonError("One of the products is no longer available.", 422);
    }

    const lineItems = data.items.map((line) => {
      const product = productRows.find((p) => p.id === line.productId)!;
      if (product.stockQty < line.qty) {
        return { error: `${product.name} has only ${product.stockQty} in stock.` };
      }
      const rate = rates.find(
        (r) => r.metal === product.metalType && r.purity === product.purity,
      );
      const ratePerGram = rate?.ratePerGramPaise ?? 0;
      const priced = calculateItem({
        netWeightMg: product.netWeightMg,
        qty: line.qty,
        ratePerGramPaise: ratePerGram,
        makingChargeType: product.makingChargeType,
        makingChargeValue: product.makingChargeValue,
        wastageBp: product.wastageBp,
        stoneChargesPaise: product.stoneChargesPaise,
        gstRateBp: DEFAULT_GST_BP,
      });
      return {
        product,
        qty: line.qty,
        ratePerGram,
        priced,
      };
    });

    const failed = lineItems.find((line) => "error" in line);
    if (failed && "error" in failed && typeof failed.error === "string") {
      return jsonError(failed.error, 422);
    }
    const valid = lineItems.filter((line): line is Exclude<typeof line, { error: string }> => !("error" in line));

    const discountPaise = Math.round(data.discount * 100);
    const oldGoldPaise = Math.round(data.oldGoldValue * 100);
    const totals = calculateInvoiceTotals({
      items: valid.map((line) => line.priced),
      discountPaise,
      oldGoldValuePaise: oldGoldPaise,
    });

    const paidPaise = Math.min(
      Math.round(data.paidAmount * 100),
      totals.totalPaise,
    );
    const status =
      paidPaise >= totals.totalPaise ? "paid" : paidPaise > 0 ? "partial" : "unpaid";
    const duePaise = Math.max(totals.totalPaise - paidPaise, 0);

    let customerId = data.customerId ?? null;
    if (!customerId && data.customerMobile && data.customerName) {
      const [created] = await db
        .insert(customers)
        .values({
          code: `CUS-${Date.now().toString().slice(-6)}`,
          name: data.customerName,
          mobile: data.customerMobile,
        })
        .onConflictDoUpdate({
          target: customers.mobile,
          set: { name: data.customerName },
        })
        .returning();
      customerId = created.id;
    }

    const invoice = await db.transaction(async (tx) => {
      const invoiceNo = await nextDocumentNumber(tx, "invoice", "INV");
      const [created] = await tx
        .insert(salesInvoices)
        .values({
          invoiceNo,
          customerId,
          branchId: data.branchId,
          channel: data.channel,
          goldRate22kPaise:
            rates.find((r) => r.metal === "gold" && r.purity === "22K")
              ?.ratePerGramPaise ?? 0,
          subtotalPaise: totals.subtotalPaise,
          makingPaise: totals.makingPaise,
          wastagePaise: totals.wastagePaise,
          stonePaise: totals.stonePaise,
          gstPaise: totals.gstPaise,
          discountPaise: totals.discountPaise,
          oldGoldValuePaise: totals.oldGoldValuePaise,
          roundOffPaise: totals.roundOffPaise,
          totalPaise: totals.totalPaise,
          paidPaise,
          duePaise,
          status,
          paymentMode: data.paymentMode,
          notes: data.notes,
          createdBy: session.user.name,
        })
        .returning();

      await tx.insert(salesItems).values(
        valid.map((line) => ({
          invoiceId: created.id,
          productId: line.product.id,
          description: line.product.name,
          hsn: "7113",
          purity: line.product.purity,
          qty: line.qty,
          grossWeightMg: line.product.grossWeightMg * line.qty,
          netWeightMg: line.product.netWeightMg * line.qty,
          ratePerGramPaise: line.ratePerGram,
          metalValuePaise: line.priced.metalValuePaise,
          makingPaise: line.priced.makingPaise,
          wastagePaise: line.priced.wastagePaise,
          stonePaise: line.priced.stonePaise,
          gstRateBp: DEFAULT_GST_BP,
          gstPaise: line.priced.gstPaise,
          totalPaise: line.priced.totalPaise,
        })),
      );

      if (paidPaise > 0) {
        await tx.insert(payments).values({
          invoiceId: created.id,
          customerId,
          direction: "in",
          mode: data.paymentMode,
          amountPaise: paidPaise,
          paidAt: new Date(),
          createdBy: session.user.name,
        });
      }

      for (const line of valid) {
        await tx
          .update(products)
          .set({
            stockQty: sql`${products.stockQty} - ${line.qty}`,
            updatedAt: new Date(),
          })
          .where(eq(products.id, line.product.id));
        await tx.insert(stockMovements).values({
          productId: line.product.id,
          branchId: data.branchId,
          type: "sale",
          qty: -line.qty,
          weightMg: -line.product.netWeightMg * line.qty,
          referenceType: "invoice",
          referenceId: created.id,
          note: `Sold on ${invoiceNo}`,
          createdBy: session.user.name,
        });
      }

      if (customerId) {
        const loyalty = Math.floor(totals.totalPaise / 100 / 100);
        await tx
          .update(customers)
          .set({
            outstandingPaise: sql`${customers.outstandingPaise} + ${duePaise}`,
            loyaltyPoints: sql`${customers.loyaltyPoints} + ${loyalty}`,
          })
          .where(eq(customers.id, customerId));
      }

      return created;
    });

    await logActivity(
      session,
      "invoice.created",
      "invoice",
      invoice.id,
      `${invoice.invoiceNo} · ₹${toNumber(invoice.totalPaise) / 100}`,
    );

    return jsonOk(
      {
        invoice: {
          id: invoice.id,
          invoiceNo: invoice.invoiceNo,
          totalPaise: invoice.totalPaise,
          duePaise: invoice.duePaise,
          status: invoice.status,
        },
      },
      201,
    );
  });
}
