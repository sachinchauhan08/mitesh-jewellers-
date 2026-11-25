import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  customers,
  products,
  salesInvoices,
  salesItems,
  stockMovements,
} from "@/lib/db/schema";
import { handleRoute, jsonError, jsonOk, readJson } from "@/lib/api-utils";
import { nextDocumentNumber } from "@/lib/documents";
import { getLatestRates } from "@/lib/rates";
import { calculateInvoiceTotals, calculateItem, DEFAULT_GST_BP } from "@/lib/pricing";

const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.coerce.number().int().positive(),
        qty: z.coerce.number().int().min(1).max(10),
      }),
    )
    .min(1, "Your bag is empty."),
  name: z.string().min(2, "Enter your full name.").max(160),
  mobile: z.string().regex(/^[0-9]{10}$/, "Enter a valid 10-digit mobile number."),
  email: z.string().email("Enter a valid email address.").optional().or(z.literal("")),
  address: z.string().min(5, "Enter a delivery or pickup address.").max(400),
  city: z.string().max(80).optional(),
  pincode: z.string().max(10).optional(),
  notes: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  return handleRoute(async () => {
    const { data, error } = await readJson(request, checkoutSchema);
    if (error) return error;

    const rates = await getLatestRates();
    const ids = [...new Set(data.items.map((item) => item.productId))];
    const productRows = await db
      .select()
      .from(products)
      .where(sql`${products.id} = ANY(${sql.raw(`ARRAY[${ids.join(",")}]`)})`);

    if (productRows.length !== ids.length) {
      return jsonError("One of the pieces in your bag is no longer available.", 422);
    }

    const lines = data.items.map((line) => {
      const product = productRows.find((p) => p.id === line.productId)!;
      if (product.status !== "active") {
        return { error: `${product.name} is not available right now.` };
      }
      if (product.stockQty < line.qty) {
        return { error: `${product.name} has only ${product.stockQty} left in stock.` };
      }
      const rate = rates.find(
        (r) => r.metal === product.metalType && r.purity === product.purity,
      );
      const priced = calculateItem({
        netWeightMg: product.netWeightMg,
        qty: line.qty,
        ratePerGramPaise: rate?.ratePerGramPaise ?? 0,
        makingChargeType: product.makingChargeType,
        makingChargeValue: product.makingChargeValue,
        wastageBp: product.wastageBp,
        stoneChargesPaise: product.stoneChargesPaise,
        gstRateBp: DEFAULT_GST_BP,
      });
      return { product, qty: line.qty, ratePerGram: rate?.ratePerGramPaise ?? 0, priced };
    });

    const failed = lines.find((line) => "error" in line);
    if (failed && "error" in failed && typeof failed.error === "string") {
      return jsonError(failed.error, 422);
    }
    const valid = lines.filter(
      (line): line is Exclude<typeof line, { error: string }> => !("error" in line),
    );

    const totals = calculateInvoiceTotals({
      items: valid.map((line) => line.priced),
      discountPaise: 0,
      oldGoldValuePaise: 0,
    });

    const mobile = data.mobile.trim();
    const [customer] = await db
      .insert(customers)
      .values({
        code: `CUS-${Date.now().toString().slice(-6)}`,
        name: data.name,
        mobile,
        email: data.email || null,
        address: data.address,
        city: data.city,
        pincode: data.pincode,
      })
      .onConflictDoUpdate({
        target: customers.mobile,
        set: {
          name: data.name,
          email: data.email || null,
          address: data.address,
          city: data.city,
          pincode: data.pincode,
        },
      })
      .returning();

    const invoice = await db.transaction(async (tx) => {
      const invoiceNo = await nextDocumentNumber(tx, "invoice", "INV");
      const [created] = await tx
        .insert(salesInvoices)
        .values({
          invoiceNo,
          customerId: customer.id,
          channel: "online",
          goldRate22kPaise:
            rates.find((r) => r.metal === "gold" && r.purity === "22K")
              ?.ratePerGramPaise ?? 0,
          subtotalPaise: totals.subtotalPaise,
          makingPaise: totals.makingPaise,
          wastagePaise: totals.wastagePaise,
          stonePaise: totals.stonePaise,
          gstPaise: totals.gstPaise,
          discountPaise: 0,
          oldGoldValuePaise: 0,
          roundOffPaise: totals.roundOffPaise,
          totalPaise: totals.totalPaise,
          paidPaise: 0,
          duePaise: totals.totalPaise,
          status: "unpaid",
          paymentMode: "cash",
          notes: [data.notes, `Online order · pickup/delivery to ${data.address}`]
            .filter(Boolean)
            .join(" · ")
            .slice(0, 500),
          createdBy: "Online store",
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
          type: "sale",
          qty: -line.qty,
          weightMg: -line.product.netWeightMg * line.qty,
          referenceType: "invoice",
          referenceId: created.id,
          note: `Online order ${invoiceNo}`,
          createdBy: "Online store",
        });
      }

      await tx
        .update(customers)
        .set({
          outstandingPaise: sql`${customers.outstandingPaise} + ${totals.totalPaise}`,
          loyaltyPoints: sql`${customers.loyaltyPoints} + ${Math.floor(totals.totalPaise / 100 / 100)}`,
        })
        .where(eq(customers.id, customer.id));

      return created;
    });

    return jsonOk(
      {
        invoice: {
          id: invoice.id,
          invoiceNo: invoice.invoiceNo,
          totalPaise: invoice.totalPaise,
        },
        customer: { name: customer.name, mobile: customer.mobile },
      },
      201,
    );
  });
}
