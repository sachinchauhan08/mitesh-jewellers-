import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { metalRates } from "@/lib/db/schema";
import {
  apiGuard,
  handleRoute,
  jsonOk,
  logActivity,
  readJson,
} from "@/lib/api-utils";
import { getLatestRates } from "@/lib/rates";

const rateSchema = z.object({
  metal: z.enum(["gold", "silver", "platinum"]),
  purity: z.string().min(1).max(10),
  ratePerGram: z.number().positive().max(10_000_000),
  note: z.string().max(300).optional(),
});

export async function GET(request: Request) {
  return handleRoute(async () => {
    const { response } = await apiGuard();
    if (response) return response;
    const url = new URL(request.url);
    const days = Math.min(Number(url.searchParams.get("days") ?? 30), 180);
    const since = new Date();
    since.setDate(since.getDate() - days);
    const history = await db
      .select()
      .from(metalRates)
      .where(eq(metalRates.isAuthorized, true))
      .orderBy(desc(metalRates.effectiveFrom), desc(metalRates.id))
      .limit(400);
    const latest = await getLatestRates();
    return jsonOk({ latest, history, since: since.toISOString() });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const { session, response } = await apiGuard("manager");
    if (response) return response;

    const { data, error } = await readJson(request, rateSchema);
    if (error) return error;

    const [rate] = await db
      .insert(metalRates)
      .values({
        metal: data.metal,
        purity: data.purity,
        ratePerGramPaise: Math.round(data.ratePerGram * 100),
        effectiveFrom: new Date(),
        source: "manual",
        isAuthorized: true,
        note: data.note,
        createdBy: session.user.name,
      })
      .returning();

    await logActivity(
      session,
      "rate.updated",
      "metal_rate",
      rate.id,
      `${data.purity} ${data.metal} set to ₹${data.ratePerGram}/g`,
    );

    return jsonOk({ rate }, 201);
  });
}
