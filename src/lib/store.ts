import "server-only";
import { calculateItem, DEFAULT_GST_BP } from "./pricing";
import type { MetalRate, Product } from "./db/schema";

export function ratePerGramFor(
  rates: MetalRate[],
  metal: string,
  purity: string,
): number {
  return (
    rates.find((rate) => rate.metal === metal && rate.purity === purity)
      ?.ratePerGramPaise ?? 0
  );
}

export function storePricePaise(product: Product, rates: MetalRate[]): number {
  const ratePerGramPaise = ratePerGramFor(rates, product.metalType, product.purity);
  if (!ratePerGramPaise) return product.sellingPricePaise;
  const priced = calculateItem({
    netWeightMg: product.netWeightMg,
    qty: 1,
    ratePerGramPaise,
    makingChargeType: product.makingChargeType,
    makingChargeValue: product.makingChargeValue,
    wastageBp: product.wastageBp,
    stoneChargesPaise: product.stoneChargesPaise,
    gstRateBp: DEFAULT_GST_BP,
  });
  return priced.totalPaise;
}
