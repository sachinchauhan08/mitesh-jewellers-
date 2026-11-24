import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "./db";
import { metalRates, type MetalRate } from "./db/schema";

export type RateMap = Record<string, MetalRate | undefined>;

export const RATE_PURITIES: { metal: "gold" | "silver" | "platinum"; purity: string }[] = [
  { metal: "gold", purity: "24K" },
  { metal: "gold", purity: "22K" },
  { metal: "gold", purity: "20K" },
  { metal: "gold", purity: "18K" },
  { metal: "silver", purity: "999" },
  { metal: "platinum", purity: "950" },
];

export async function getLatestRates(): Promise<MetalRate[]> {
  const rows = await db
    .select()
    .from(metalRates)
    .where(eq(metalRates.isAuthorized, true))
    .orderBy(desc(metalRates.effectiveFrom), desc(metalRates.id));

  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${row.metal}:${row.purity}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function rateFor(
  rates: MetalRate[],
  metal: string,
  purity: string,
): MetalRate | undefined {
  return rates.find((r) => r.metal === metal && r.purity === purity);
}

export async function getRatePerGram(
  metal: string,
  purity: string,
): Promise<number> {
  const all = await getLatestRates();
  return all.find((r) => r.metal === metal && r.purity === purity)?.ratePerGramPaise ?? 0;
}
