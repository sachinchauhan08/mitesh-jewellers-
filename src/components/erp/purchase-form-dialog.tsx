"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { paise } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";

type Option = { id: number; name: string };
type ProductOption = { id: number; name: string; sku: string; metalType: string; purity: string };

type Line = {
  key: number;
  productId: string;
  description: string;
  metalType: string;
  purity: string;
  weightG: string;
  ratePerGram: string;
  qty: string;
};

function emptyLine(key: number): Line {
  return {
    key,
    productId: "none",
    description: "",
    metalType: "gold",
    purity: "22K",
    weightG: "",
    ratePerGram: "",
    qty: "1",
  };
}

export function PurchaseFormDialog({
  suppliers,
  products,
  branches,
}: {
  suppliers: Option[];
  products: ProductOption[];
  branches: Option[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [type, setType] = useState("finished");
  const [paid, setPaid] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine(1)]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = lines.reduce(
    (sum, line) => sum + Number(line.weightG || 0) * Number(line.ratePerGram || 0) * 100,
    0,
  );
  const gst = Math.round(subtotal * 0.03);
  const total = subtotal + gst;

  function updateLine(key: number, patch: Partial<Line>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!supplierId) {
      setError("Choose the supplier for this purchase.");
      return;
    }
    if (!lines.some((line) => line.description && Number(line.weightG) > 0)) {
      setError("Add at least one line with a description and weight.");
      return;
    }
    setSaving(true);
    setError(null);
    const response = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId: Number(supplierId),
        branchId: branchId ? Number(branchId) : undefined,
        type,
        paidAmount: Number(paid || 0),
        notes: notes || undefined,
        items: lines
          .filter((line) => line.description && Number(line.weightG) > 0)
          .map((line) => ({
            productId: line.productId !== "none" ? Number(line.productId) : undefined,
            description: line.description,
            metalType: line.metalType,
            purity: line.purity,
            weightG: Number(line.weightG),
            ratePerGram: Number(line.ratePerGram),
            qty: Number(line.qty || 1),
          })),
      }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "We could not save this purchase.");
      setSaving(false);
      return;
    }
    toast.success("Purchase recorded");
    setSaving(false);
    setOpen(false);
    setLines([emptyLine(Date.now())]);
    setPaid("");
    setNotes("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-9">
          <Plus className="mr-1.5 size-4" /> New purchase
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Record a purchase</DialogTitle>
            <DialogDescription>
              Raw metal, finished stock and customer old-gold lots are tracked separately.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={String(supplier.id)}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="finished">Finished jewellery</SelectItem>
                  <SelectItem value="raw_gold">Raw gold</SelectItem>
                  <SelectItem value="old_gold">Old gold lot</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Showroom</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Purchase lines</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setLines((current) => [...current, emptyLine(Date.now())])}
              >
                <Plus className="mr-1 size-3" /> Add line
              </Button>
            </div>
            <div className="space-y-2">
              {lines.map((line) => (
                <div key={line.key} className="rounded-lg border border-border p-3">
                  <div className="grid gap-2 sm:grid-cols-12">
                    <div className="sm:col-span-4">
                      <Label className="text-[11px] text-muted-foreground">Description</Label>
                      <Input
                        value={line.description}
                        onChange={(e) => updateLine(line.key, { description: e.target.value })}
                        placeholder="24K raw gold biscuit"
                        className="mt-1 h-8 text-xs"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <Label className="text-[11px] text-muted-foreground">Link product</Label>
                      <Select
                        value={line.productId}
                        onValueChange={(value) => {
                          const product = products.find((p) => String(p.id) === value);
                          updateLine(line.key, {
                            productId: value,
                            ...(product
                              ? {
                                  description: product.name,
                                  metalType: product.metalType,
                                  purity: product.purity,
                                }
                              : {}),
                          });
                        }}
                      >
                        <SelectTrigger className="mt-1 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Not linked</SelectItem>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={String(product.id)}>
                              {product.sku} · {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-[11px] text-muted-foreground">Metal</Label>
                      <Select
                        value={line.metalType}
                        onValueChange={(value) => updateLine(line.key, { metalType: value })}
                      >
                        <SelectTrigger className="mt-1 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gold">Gold</SelectItem>
                          <SelectItem value="silver">Silver</SelectItem>
                          <SelectItem value="platinum">Platinum</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-[11px] text-muted-foreground">Purity</Label>
                      <Input
                        value={line.purity}
                        onChange={(e) => updateLine(line.key, { purity: e.target.value })}
                        className="mt-1 h-8 text-xs"
                      />
                    </div>
                    <div className="flex items-end sm:col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          setLines((current) =>
                            current.length === 1
                              ? current
                              : current.filter((l) => l.key !== line.key),
                          )
                        }
                        aria-label="Remove line"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-4">
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Weight (g)</Label>
                      <Input
                        type="number"
                        step="0.001"
                        min={0}
                        value={line.weightG}
                        onChange={(e) => updateLine(line.key, { weightG: e.target.value })}
                        className="mt-1 h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Rate / g (₹)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={line.ratePerGram}
                        onChange={(e) => updateLine(line.key, { ratePerGram: e.target.value })}
                        className="mt-1 h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Quantity</Label>
                      <Input
                        type="number"
                        min={1}
                        value={line.qty}
                        onChange={(e) => updateLine(line.key, { qty: e.target.value })}
                        className="mt-1 h-8 text-xs"
                      />
                    </div>
                    <div className="flex flex-col justify-end">
                      <Label className="text-[11px] text-muted-foreground">Amount</Label>
                      <p className="tabular mt-1 h-8 text-sm font-medium leading-8">
                        {paise(
                          Number(line.weightG || 0) * Number(line.ratePerGram || 0) * 100,
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="purchase-paid">Amount paid now (₹)</Label>
              <Input
                id="purchase-paid"
                type="number"
                min={0}
                step="1"
                value={paid}
                onChange={(e) => setPaid(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase-notes">Notes</Label>
              <Textarea
                id="purchase-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Invoice reference, lot details…"
              />
            </div>
          </div>

          <div className="space-y-1 rounded-lg bg-muted/60 p-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular text-foreground">{paise(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>GST 3%</span>
              <span className="tabular text-foreground">{paise(gst)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Purchase total</span>
              <span className="tabular">{paise(total)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Balance to supplier</span>
              <span className="tabular">{paise(Math.max(total - Number(paid || 0) * 100, 0))}</span>
            </div>
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
              {saving ? "Saving…" : "Record purchase"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
