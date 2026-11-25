"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/components/store/cart-provider";
import { paise } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Placed = { invoiceNo: string; totalPaise: number; name: string };

const EMPTY = {
  name: "",
  mobile: "",
  email: "",
  address: "",
  city: "",
  pincode: "",
  notes: "",
};

export function CartClient() {
  const { lines, ready, totalPaise, count, setQty, remove, clear } = useCart();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Placed | null>(null);

  function set(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!lines.length) return;
    setSaving(true);
    setError(null);
    const response = await fetch("/api/store/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: lines.map((line) => ({ productId: line.productId, qty: line.qty })),
        name: form.name,
        mobile: form.mobile,
        email: form.email || undefined,
        address: form.address,
        city: form.city || undefined,
        pincode: form.pincode || undefined,
        notes: form.notes || undefined,
      }),
    });
    const payload = (await response.json()) as {
      error?: string;
      invoice?: { invoiceNo: string; totalPaise: number };
    };
    if (!response.ok || !payload.invoice) {
      setError(payload.error ?? "We could not place this order. Please try again.");
      setSaving(false);
      return;
    }
    setPlaced({
      invoiceNo: payload.invoice.invoiceNo,
      totalPaise: payload.invoice.totalPaise,
      name: form.name,
    });
    clear();
    setForm(EMPTY);
    setSaving(false);
    toast.success(`Order ${payload.invoice.invoiceNo} placed`);
  }

  if (placed) {
    return (
      <div className="mt-6 rounded-2xl border border-gold/40 bg-gold-soft/50 p-8 text-center">
        <CheckCircle2 className="mx-auto size-10 text-gold-deep" />
        <h2 className="mt-3 font-display text-2xl">Thank you, {placed.name.split(" ")[0]}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your order <span className="font-medium text-foreground">{placed.invoiceNo}</span> is
          reserved. Our team will call you to confirm pickup or delivery.
        </p>
        <p className="tabular mt-3 text-lg font-semibold">{paise(placed.totalPaise)}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Payable at the showroom or on delivery. Bring a photo ID for collection.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button asChild className="h-10">
            <Link href="/shop">Continue shopping</Link>
          </Button>
          <Button asChild variant="outline" className="h-10">
            <Link href="/contact">Find a showroom</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="mt-8 flex items-center justify-center rounded-xl border border-border p-16 text-xs text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" /> Loading your bag…
      </div>
    );
  }

  if (!lines.length) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-border p-14 text-center">
        <ShoppingBag className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">Your bag is empty</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Browse the collection and add a piece to reserve it.
        </p>
        <Button asChild className="mt-4 h-10">
          <Link href="/shop">Shop jewellery</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        {lines.map((line) => (
          <div key={line.productId} className="flex gap-3 rounded-xl border border-border bg-card p-3">
            <Link href={`/shop/${line.slug}`} className="size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
              {line.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={line.image} alt={line.name} className="size-full object-cover" />
              ) : null}
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/shop/${line.slug}`} className="block truncate text-sm font-medium hover:underline">
                    {line.name}
                  </Link>
                  <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                    {line.purity} · {(line.netWeightMg / 1000).toFixed(3)} g
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(line.productId)}
                  aria-label={`Remove ${line.name}`}
                  className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex items-center rounded-full border border-border">
                  <button
                    type="button"
                    onClick={() => setQty(line.productId, line.qty - 1)}
                    aria-label={`Decrease quantity of ${line.name}`}
                    className="inline-flex size-8 items-center justify-center rounded-full hover:bg-muted"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="tabular w-6 text-center text-xs">{line.qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty(line.productId, line.qty + 1)}
                    aria-label={`Increase quantity of ${line.name}`}
                    className="inline-flex size-8 items-center justify-center rounded-full hover:bg-muted"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <p className="tabular text-sm font-semibold">{paise(line.pricePaise * line.qty)}</p>
              </div>
            </div>
          </div>
        ))}
        <p className="text-[11px] text-muted-foreground">
          {count} piece{count === 1 ? "" : "s"} in your bag. Prices are re-verified against the
          authorised rate when the order is placed.
        </p>
      </div>

      <form onSubmit={submit} className="h-fit rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Reserve your pieces</h2>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          No online payment. Pay at the showroom or on delivery.
        </p>
        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ck-name">Full name</Label>
            <Input id="ck-name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ck-mobile">Mobile</Label>
            <Input
              id="ck-mobile"
              type="tel"
              inputMode="tel"
              maxLength={10}
              value={form.mobile}
              onChange={(e) => set("mobile", e.target.value.replace(/\D/g, ""))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ck-email">Email (optional)</Label>
            <Input id="ck-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ck-address">Address</Label>
            <Textarea
              id="ck-address"
              rows={2}
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ck-city">City</Label>
              <Input id="ck-city" value={form.city} onChange={(e) => set("city", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ck-pin">PIN</Label>
              <Input
                id="ck-pin"
                inputMode="numeric"
                maxLength={6}
                value={form.pincode}
                onChange={(e) => set("pincode", e.target.value.replace(/\D/g, ""))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ck-notes">Notes (optional)</Label>
            <Textarea
              id="ck-notes"
              rows={2}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Preferred showroom, gift wrap, delivery timing…"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm">
          <span className="text-muted-foreground">Total incl. GST</span>
          <span className="tabular text-lg font-semibold">{paise(totalPaise)}</span>
        </div>

        {error ? (
          <p role="alert" className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="mt-3 h-11 w-full" disabled={saving}>
          {saving ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
          {saving ? "Placing order…" : "Place order"}
        </Button>
      </form>
    </div>
  );
}
