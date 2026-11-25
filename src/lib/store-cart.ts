export type CartLine = {
  productId: number;
  slug: string;
  name: string;
  image: string | null;
  purity: string;
  metal: string;
  netWeightMg: number;
  pricePaise: number;
  qty: number;
};

const KEY = "mitesh-store-cart-v1";
const EVENT = "mitesh-cart-change";

export function readCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (line) => line && Number.isFinite(line.productId) && line.qty > 0,
    );
  } catch {
    return [];
  }
}

export function writeCart(lines: CartLine[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(lines));
  window.dispatchEvent(new Event(EVENT));
}

export const CART_EVENT = EVENT;
