"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BadgeIndianRupee,
  Check,
  Coins,
  Loader2,
  Minus,
  Plus,
  ScanBarcode,
  Search,
  ShoppingBag,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { calculateInvoiceTotals, calculateItem } from "@/lib/pricing";
import { grams, paise, titleCase } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type POSProduct = {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  categoryName: string | null;
  metalType: string;
  purity: string;
  grossWeightMg: number;
  netWeightMg: number;
  makingChargeType: string;
  makingChargeValue: number;
  wastageBp: number;
  stoneChargesPaise: number;
  sellingPricePaise: number;
  stockQty: number;
  images: string[];
};

type CustomerOption = { id: number; name: string; mobile: string; loyaltyPoints: number };
type RateOption = { metal: string; purity: string; ratePerGramPaise: number };
type BranchOption = { id: number; name: string };

type CartLine = { product: POSProduct; qty: number };

const PAYMENT_MODES = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "bank", label: "Bank" },
] as const;

function priceProduct(product: POSProduct, rate: number) {
  return calculateItem({
    netWeightMg: product.netWeightMg,
    qty: 1,
    ratePerGramPaise: rate,
    makingChargeType: product.makingChargeType as "per_gram" | "per_piece" | "percent",
    makingChargeValue: product.makingChargeValue,
    wastageBp: product.wastageBp,
    stoneChargesPaise: product.stoneChargesPaise,
    gstRateBp: 300,
  });
}

export function PosClient({
  products,
  customers,
  rates,
  branches,
  initialBranchId,
}: {
  products: POSProduct[];
  customers: CustomerOption[];
  rates: RateOption[];
  branches: BranchOption[];
  initialBranchId?: number;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState("walkin");
  const [branchId, setBranchId] = useState(String(initialBranchId ?? branches[0]?.id ?? ""));
  const [discount, setDiscount] = useState("");
  const [oldGold, setOldGold] = useState("");
  const [paymentMode, setPaymentMode] = useState<"cash" | "upi" | "card" | "bank">("cash");
  const [paid, setPaid] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  const rateOf = (metal: string, purity: string) =>
    rates.find((r) => r.metal === metal && r.purity === purity)?.ratePerGramPaise ?? 0;

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.categoryName).filter(Boolean) as string[]);
    return [...set].sort();
  }, [products]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products.filter((product) => {
      if (category !== "all" && product.categoryName !== category) return false;
      if (!term) return true;
      return `${product.name} ${product.sku} ${product.barcode}`
        .toLowerCase()
        .includes(term);
    });
  }, [products, query, category]);

  const cartDetails = cart.map((line) => {
    const rate = rateOf(line.product.metalType, line.product.purity);
    const priced = priceProduct(line.product, rate);
    return {
      ...line,
      rate,
      priced: {
        ...priced,
        metalValuePaise: priced.metalValuePaise * line.qty,
        makingPaise: priced.makingPaise * line.qty,
        wastagePaise: priced.wastagePaise * line.qty,
        stonePaise: priced.stonePaise * line.qty,
        gstPaise: priced.gstPaise * line.qty,
        totalPaise: priced.totalPaise * line.qty,
      },
    };
  });

  const totals = calculateInvoiceTotals({
    items: cartDetails.map((line) => line.priced),
    discountPaise: Math.round(Number(discount || 0) * 100),
    oldGoldValuePaise: Math.round(Number(oldGold || 0) * 100),
  });

  const paidValue =
    paid.trim() === "" ? totals.totalPaise / 100 : Number(paid || 0);
  const paidPaise = Math.min(Math.round(paidValue * 100), totals.totalPaise);
  const duePaise = Math.max(totals.totalPaise - paidPaise, 0);
  const totalWeight = cartDetails.reduce(
    (sum, line) => sum + line.product.netWeightMg * line.qty,
    0,
  );
  const itemCount = cart.reduce((sum, line) => sum + line.qty, 0);

  function addProduct(product: POSProduct) {
    const existing = cart.find((line) => line.product.id === product.id);
    const nextQty = (existing?.qty ?? 0) + 1;
    if (nextQty > product.stockQty) {
      toast.error(`${product.name} has only ${product.stockQty} in stock.`);
      return;
    }
    setCart((current) =>
      existing
        ? current.map((line) =>
            line.product.id === product.id ? { ...line, qty: nextQty } : line,
          )
        : [...current, { product, qty: 1 }],
    );
  }

  function setQty(productId: number, qty: number) {
    const line = cart.find((l) => l.product.id === productId);
    if (!line) return;
    if (qty <= 0) {
      setCart((current) => current.filter((l) => l.product.id !== productId));
      return;
    }
    if (qty > line.product.stockQty) {
      toast.error(`Only ${line.product.stockQty} available.`);
      return;
    }
    setCart((current) =>
      current.map((l) => (l.product.id === productId ? { ...l, qty } : l)),
    );
  }

  function handleScan(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const term = query.trim().toLowerCase();
    if (!term) return;
    const match = products.find(
      (p) => p.barcode.toLowerCase() === term || p.sku.toLowerCase() === term,
    );
    if (match) {
      addProduct(match);
      setQuery("");
    }
  }

  async function submitInvoice() {
    if (!cart.length) {
      setError("Add at least one product to the bill.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const response = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: customerId === "walkin" ? undefined : Number(customerId),
        branchId: Number(branchId),
        items: cart.map((line) => ({ productId: line.product.id, qty: line.qty })),
        discount: Number(discount || 0),
        oldGoldValue: Number(oldGold || 0),
        paymentMode,
        paidAmount: paidValue,
        notes: notes || undefined,
      }),
    });
    const payload = (await response.json()) as {
      error?: string;
      invoice?: { id: number; invoiceNo: string };
    };
    if (!response.ok || !payload.invoice) {
      setError(payload.error ?? "The invoice could not be saved. Check stock and try again.");
      setSubmitting(false);
      return;
    }
    toast.success(`${payload.invoice.invoiceNo} billed successfully`);
    router.push(`/invoices/${payload.invoice.id}?created=1`);
    router.refresh();
  }

  const cartPanel = (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b border-border p-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ShoppingBag className="size-4 text-gold-deep" /> Current bill
            <Badge variant="secondary" className="rounded-full text-[10px]">
              {itemCount} items
            </Badge>
          </h2>
          {cart.length ? (
            <button
              type="button"
              onClick={() => setCart([])}
              className="text-[11px] text-muted-foreground hover:text-destructive"
            >
              Clear
            </button>
          ) : null}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Customer</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="walkin">Walk-in customer</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={String(customer.id)}>
                    {customer.name} · {customer.mobile}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Showroom</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={String(branch.id)}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <QuickAddCustomer
          onCreated={(customer) => {
            setCustomerId(String(customer.id));
            router.refresh();
          }}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {cartDetails.length ? (
          <ul className="space-y-3">
            {cartDetails.map((line) => (
              <li key={line.product.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{line.product.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {line.product.purity} {line.product.metalType} ·{" "}
                      {grams(line.product.netWeightMg)} · {paise(line.rate)}/g
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQty(line.product.id, 0)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${line.product.name}`}
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-7"
                      onClick={() => setQty(line.product.id, line.qty - 1)}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="size-3" />
                    </Button>
                    <span className="tabular w-7 text-center text-sm">{line.qty}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-7"
                      onClick={() => setQty(line.product.id, line.qty + 1)}
                      aria-label="Increase quantity"
                    >
                      <Plus className="size-3" />
                    </Button>
                  </div>
                  <span className="tabular text-sm font-medium">
                    {paise(line.priced.totalPaise)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex h-full flex-col items-center justify-center py-10 text-center">
            <ShoppingBag className="size-8 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-medium">The bill is empty</p>
            <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">
              Scan a barcode or tap a piece to start a sale.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-3 border-t border-border p-4">
        <div className="space-y-2 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Metal value</span>
            <span className="tabular text-foreground">{paise(totals.subtotalPaise)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Making + wastage</span>
            <span className="tabular text-foreground">
              {paise(totals.makingPaise + totals.wastagePaise)}
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Stone charges</span>
            <span className="tabular text-foreground">{paise(totals.stonePaise)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>GST 3%</span>
            <span className="tabular text-foreground">{paise(totals.gstPaise)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="space-y-1">
              <Label htmlFor="pos-discount" className="text-[11px] text-muted-foreground">
                Discount (₹)
              </Label>
              <Input
                id="pos-discount"
                type="number"
                min={0}
                step="1"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pos-oldgold" className="text-[11px] text-muted-foreground">
                Old gold (₹)
              </Label>
              <Input
                id="pos-oldgold"
                type="number"
                min={0}
                step="1"
                value={oldGold}
                onChange={(e) => setOldGold(e.target.value)}
                placeholder="0"
                className="h-8 text-xs"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-primary px-3 py-2.5 text-primary-foreground">
          <div className="flex items-center justify-between text-xs opacity-70">
            <span>{grams(totalWeight)} net</span>
            {totals.roundOffPaise !== 0 ? (
              <span>Round off {paise(totals.roundOffPaise)}</span>
            ) : null}
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-sm">Total payable</span>
            <span className="tabular text-xl font-semibold">{paise(totals.totalPaise)}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-1.5">
            {PAYMENT_MODES.map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => setPaymentMode(mode.value)}
                className={`h-8 rounded-md border text-[11px] transition-colors ${
                  paymentMode === mode.value
                    ? "border-gold bg-gold-soft font-medium text-gold-deep"
                    : "border-border text-muted-foreground hover:border-gold/50"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="pos-paid" className="text-[11px] text-muted-foreground">
                Amount received (₹)
              </Label>
              <Input
                id="pos-paid"
                type="number"
                min={0}
                step="1"
                value={paid}
                onChange={(e) => setPaid(e.target.value)}
                placeholder={(totals.totalPaise / 100).toFixed(2)}
                className="h-9"
              />
            </div>
            <div className="pb-1 text-right text-[11px]">
              <p className="text-muted-foreground">Balance</p>
              <p className={`tabular font-medium ${duePaise > 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                {paise(duePaise)}
              </p>
            </div>
          </div>
        </div>

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}

        <Button
          className="h-11 w-full"
          onClick={submitInvoice}
          disabled={submitting || !cart.length}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" /> Billing…
            </>
          ) : (
            <>
              <Check className="mr-2 size-4" /> Complete sale · {paise(totals.totalPaise)}
            </>
          )}
        </Button>
        <p className="text-center text-[10px] text-muted-foreground">
          {paidPaise > 0 && duePaise > 0
            ? `Part payment recorded · ${paise(duePaise)} added to customer ledger`
            : "Invoice and stock update together."}
        </p>
      </div>
    </div>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
      <div className="min-w-0 space-y-3">
        <div className="relative">
          <ScanBarcode className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleScan}
            placeholder="Scan barcode or search by name / SKU, then press Enter"
            className="h-11 bg-card pl-9 pr-20"
            aria-label="Scan or search products"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
            F2
          </span>
        </div>

        <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setCategory("all")}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors ${
              category === "all"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-gold/60"
            }`}
          >
            All pieces
          </button>
          {categories.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setCategory(name)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                category === name
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-gold/60"
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((product) => {
            const rate = rateOf(product.metalType, product.purity);
            const price = priceProduct(product, rate);
            const outOfStock = product.stockQty <= 0;
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => addProduct(product)}
                disabled={outOfStock}
                className="group overflow-hidden rounded-lg border border-border bg-card text-left transition-all hover:border-gold/60 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  {product.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.images[0]}
                      alt=""
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <ShoppingBag className="size-6 text-muted-foreground" />
                    </div>
                  )}
                  <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium backdrop-blur">
                    {product.stockQty} left
                  </span>
                </div>
                <div className="p-3">
                  <p className="line-clamp-1 text-sm font-medium">{product.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {product.sku} · {product.purity} {titleCase(product.metalType)}
                  </p>
                  <div className="mt-2 flex items-end justify-between gap-2">
                    <div>
                      <p className="tabular text-sm font-semibold">{paise(price.totalPaise)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {grams(product.netWeightMg)}
                      </p>
                    </div>
                    <span className="flex size-7 items-center justify-center rounded-full bg-gold-soft text-gold-deep">
                      <Plus className="size-3.5" />
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
          {!filtered.length ? (
            <div className="col-span-full rounded-lg border border-dashed border-border p-10 text-center">
              <Search className="mx-auto size-6 text-muted-foreground/50" />
              <p className="mt-2 text-sm font-medium">No pieces found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try a different name, SKU or barcode.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <Card className="sticky top-20 hidden max-h-[calc(100vh-6rem)] overflow-hidden lg:flex lg:flex-col">
        {cartPanel}
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 backdrop-blur lg:hidden">
        <Sheet open={mobileCartOpen} onOpenChange={setMobileCartOpen}>
          <SheetTrigger asChild>
            <Button className="h-12 w-full justify-between" disabled={!cart.length}>
              <span className="flex items-center gap-2">
                <ShoppingBag className="size-4" /> {itemCount} items
              </span>
              <span className="tabular">{paise(totals.totalPaise)} · Review</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[92vh] p-0">
            <SheetHeader className="border-b border-border px-4 py-3 text-left">
              <SheetTitle className="text-sm">Current bill</SheetTitle>
            </SheetHeader>
            <div className="h-[calc(92vh-3.5rem)]">{cartPanel}</div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="lg:hidden">
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Coins className="size-3.5 text-gold-deep" />
          <span>
            22K gold {paise(rateOf("gold", "22K"))}/g · Silver {paise(rateOf("silver", "999"))}/g
          </span>
          <Link href="/old-gold" className="ml-auto underline underline-offset-2">
            Old gold
          </Link>
        </div>
      </div>
    </div>
  );
}

function QuickAddCustomer({ onCreated }: { onCreated: (customer: CustomerOption) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const response = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, mobile }),
    });
    const payload = (await response.json()) as {
      error?: string;
      customer?: CustomerOption;
    };
    if (!response.ok || !payload.customer) {
      setError(payload.error ?? "We could not add this customer.");
      setSaving(false);
      return;
    }
    toast.success(`${payload.customer.name} added`);
    onCreated(payload.customer);
    setSaving(false);
    setOpen(false);
    setName("");
    setMobile("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <UserPlus className="size-3.5" /> New customer
        </button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add a customer</DialogTitle>
            <DialogDescription>
              Create a quick profile so this sale lands in their ledger.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="qc-name">Full name</Label>
            <Input
              id="qc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qc-mobile">Mobile</Label>
            <Input
              id="qc-mobile"
              type="tel"
              inputMode="tel"
              pattern="[0-9]{10}"
              maxLength={10}
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
              placeholder="10-digit mobile"
              required
            />
          </div>
          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {saving ? "Adding…" : "Add customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
