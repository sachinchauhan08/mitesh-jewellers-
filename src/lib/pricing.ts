export type MakingChargeType = "per_gram" | "per_piece" | "percent";

export type PriceItemInput = {
  netWeightMg: number;
  qty: number;
  ratePerGramPaise: number;
  makingChargeType: MakingChargeType;
  makingChargeValue: number;
  wastageBp: number;
  stoneChargesPaise: number;
  gstRateBp: number;
  fixedPricePaise?: number;
};

export type PriceItemResult = {
  metalValuePaise: number;
  makingPaise: number;
  wastagePaise: number;
  stonePaise: number;
  taxablePaise: number;
  gstPaise: number;
  totalPaise: number;
};

export const DEFAULT_GST_BP = 300;

export function calculateItem(input: PriceItemInput): PriceItemResult {
  const metalValuePaise = Math.round(
    (input.netWeightMg / 1000) * input.ratePerGramPaise * input.qty,
  );
  const wastagePaise = Math.round((metalValuePaise * input.wastageBp) / 10000);
  const makingPaise = (() => {
    switch (input.makingChargeType) {
      case "per_gram":
        return Math.round((input.netWeightMg / 1000) * input.makingChargeValue * input.qty);
      case "percent":
        return Math.round((metalValuePaise * input.makingChargeValue) / 10000);
      case "per_piece":
      default:
        return Math.round(input.makingChargeValue * input.qty);
    }
  })();
  const stonePaise = Math.round(input.stoneChargesPaise * input.qty);
  const taxablePaise = metalValuePaise + wastagePaise + makingPaise + stonePaise;
  const gstPaise = Math.round((taxablePaise * input.gstRateBp) / 10000);
  return {
    metalValuePaise,
    makingPaise,
    wastagePaise,
    stonePaise,
    taxablePaise,
    gstPaise,
    totalPaise: taxablePaise + gstPaise,
  };
}

export type InvoiceTotalsInput = {
  items: PriceItemResult[];
  discountPaise: number;
  oldGoldValuePaise: number;
};

export type InvoiceTotals = {
  subtotalPaise: number;
  makingPaise: number;
  wastagePaise: number;
  stonePaise: number;
  gstPaise: number;
  discountPaise: number;
  oldGoldValuePaise: number;
  roundOffPaise: number;
  totalPaise: number;
};

export function calculateInvoiceTotals(input: InvoiceTotalsInput): InvoiceTotals {
  const sum = input.items.reduce(
    (acc, item) => ({
      metal: acc.metal + item.metalValuePaise,
      making: acc.making + item.makingPaise,
      wastage: acc.wastage + item.wastagePaise,
      stone: acc.stone + item.stonePaise,
      gst: acc.gst + item.gstPaise,
    }),
    { metal: 0, making: 0, wastage: 0, stone: 0, gst: 0 },
  );

  const gross =
    sum.metal + sum.making + sum.wastage + sum.stone + sum.gst;
  const net = gross - input.discountPaise - input.oldGoldValuePaise;
  const rounded = Math.round(net / 100) * 100;
  return {
    subtotalPaise: sum.metal,
    makingPaise: sum.making,
    wastagePaise: sum.wastage,
    stonePaise: sum.stone,
    gstPaise: sum.gst,
    discountPaise: input.discountPaise,
    oldGoldValuePaise: input.oldGoldValuePaise,
    roundOffPaise: rounded - net,
    totalPaise: Math.max(rounded, 0),
  };
}

export function estimateOldGold(input: {
  grossWeightMg: number;
  purityBp: number;
  meltingLossBp: number;
  ratePerGramPaise: number;
  deductionBp: number;
}) {
  const purityFactor = input.purityBp / 10000;
  const afterPurityMg = Math.round(input.grossWeightMg * purityFactor);
  const netWeightMg = Math.round(
    afterPurityMg * (1 - input.meltingLossBp / 10000),
  );
  const grossValue = Math.round((netWeightMg / 1000) * input.ratePerGramPaise);
  const finalValuePaise = Math.max(
    0,
    Math.round(grossValue * (1 - input.deductionBp / 10000)),
  );
  return { netWeightMg, grossValue, finalValuePaise };
}

export function purityFactor(purity: string): number {
  switch (purity) {
    case "24K":
      return 1;
    case "22K":
      return 22 / 24;
    case "20K":
      return 20 / 24;
    case "18K":
      return 18 / 24;
    default:
      return 1;
  }
}
