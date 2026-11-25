"use client";

import { useState } from "react";
import { Check, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/components/store/cart-provider";
import type { CartLine } from "@/lib/store-cart";

export function AddToCart({
  line,
  variant = "icon",
  disabled = false,
}: {
  line: Omit<CartLine, "qty">;
  variant?: "icon" | "full";
  disabled?: boolean;
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  function handle() {
    add(line);
    setAdded(true);
    toast.success(`${line.name} added to your bag`);
    window.setTimeout(() => setAdded(false), 1800);
  }

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={handle}
        disabled={disabled}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {added ? <Check className="size-4" /> : <ShoppingBag className="size-4" />}
        {disabled ? "Out of stock" : added ? "Added to bag" : "Add to bag"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={disabled}
      aria-label={`Add ${line.name} to bag`}
      className="inline-flex size-8 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-gold hover:text-gold-deep disabled:cursor-not-allowed disabled:opacity-40"
    >
      {added ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
    </button>
  );
}
