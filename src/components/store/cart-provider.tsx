"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CART_EVENT, readCart, writeCart, type CartLine } from "@/lib/store-cart";

type CartContextValue = {
  lines: CartLine[];
  ready: boolean;
  count: number;
  totalPaise: number;
  add: (line: Omit<CartLine, "qty">, qty?: number) => void;
  remove: (productId: number) => void;
  setQty: (productId: number, qty: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLines(readCart());
    setReady(true);
    const sync = () => setLines(readCart());
    window.addEventListener(CART_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CART_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const add = useCallback((line: Omit<CartLine, "qty">, qty = 1) => {
    const current = readCart();
    const existing = current.find((item) => item.productId === line.productId);
    const next = existing
      ? current.map((item) =>
          item.productId === line.productId
            ? { ...item, qty: Math.min(10, item.qty + qty), pricePaise: line.pricePaise }
            : item,
        )
      : [...current, { ...line, qty }];
    writeCart(next);
  }, []);

  const remove = useCallback((productId: number) => {
    writeCart(readCart().filter((item) => item.productId !== productId));
  }, []);

  const setQty = useCallback((productId: number, qty: number) => {
    if (qty <= 0) {
      writeCart(readCart().filter((item) => item.productId !== productId));
      return;
    }
    writeCart(
      readCart().map((item) =>
        item.productId === productId ? { ...item, qty: Math.min(10, qty) } : item,
      ),
    );
  }, []);

  const clear = useCallback(() => writeCart([]), []);

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((sum, line) => sum + line.qty, 0);
    const totalPaise = lines.reduce((sum, line) => sum + line.pricePaise * line.qty, 0);
    return { lines, ready, count, totalPaise, add, remove, setQty, clear };
  }, [lines, ready, add, remove, setQty, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
