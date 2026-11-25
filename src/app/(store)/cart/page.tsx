import type { Metadata } from "next";
import { getLatestRates } from "@/lib/rates";
import { paise } from "@/lib/format";
import { StoreShell } from "@/components/store/store-shell";
import { CartClient } from "@/components/store/cart-client";

export const metadata: Metadata = { title: "Your bag" };

export default async function CartPage() {
  const rates = await getLatestRates();
  const ticker = rates
    .filter((r) => r.metal === "gold" || r.metal === "silver")
    .slice(0, 4)
    .map((r) => ({ label: `${r.purity} ${r.metal}`, value: `${paise(r.ratePerGramPaise)}/g` }));

  return (
    <StoreShell rates={ticker}>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-gold-deep">
          Almost yours
        </p>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl">Your bag</h1>
        <CartClient />
      </div>
    </StoreShell>
  );
}
