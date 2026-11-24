"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export type ProductRecord = {
  id: number;
  sku: string;
  barcode: string;
  name: string;
  slug: string;
  description?: string | null;
  categoryId: number;
  branchId: number | null;
  metalType: string;
  purity: string;
  grossWeightMg: number;
  netWeightMg: number;
  stoneWeightMg: number;
  diamondWeightMg: number;
  makingChargeType: string;
  makingChargeValue: number;
  wastageBp: number;
  stoneChargesPaise: number;
  huid?: string | null;
  purchasePricePaise: number;
  sellingPricePaise: number;
  stockQty: number;
  minStockQty: number;
  status: string;
  images: string[];
  isFeatured: boolean;
  categoryName?: string | null;
  categorySlug?: string | null;
};

type Option = { id: number; name: string };

const PURITIES = ["24K", "22K", "20K", "18K", "999", "950"];

function toForm(product?: ProductRecord | null) {
  return {
    name: product?.name ?? "",
    categoryId: product ? String(product.categoryId) : "",
    branchId: product?.branchId ? String(product.branchId) : "",
    metalType: product?.metalType ?? "gold",
    purity: product?.purity ?? "22K",
    grossWeightG: product ? (product.grossWeightMg / 1000).toString() : "",
    netWeightG: product ? (product.netWeightMg / 1000).toString() : "",
    stoneWeightG: product ? (product.stoneWeightMg / 1000).toString() : "0",
    diamondWeightG: product ? (product.diamondWeightMg / 1000).toString() : "0",
    makingChargeType: product?.makingChargeType ?? "per_gram",
    makingChargeValue: product ? (product.makingChargeValue / 100).toString() : "",
    wastagePercent: product ? (product.wastageBp / 100).toString() : "0",
    stoneCharges: product ? (product.stoneChargesPaise / 100).toString() : "0",
    huid: product?.huid ?? "",
    purchasePrice: product ? (product.purchasePricePaise / 100).toString() : "",
    sellingPrice: product ? (product.sellingPricePaise / 100).toString() : "",
    stockQty: product ? String(product.stockQty) : "0",
    minStockQty: product ? String(product.minStockQty) : "3",
    status: product?.status ?? "active",
    images: product?.images?.join(", ") ?? "",
    description: product?.description ?? "",
    isFeatured: product?.isFeatured ?? false,
  };
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  categories,
  branches,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: ProductRecord | null;
  categories: Option[];
  branches: Option[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState(() => toForm(product));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const body = {
      name: form.name,
      categoryId: Number(form.categoryId),
      branchId: form.branchId ? Number(form.branchId) : undefined,
      metalType: form.metalType,
      purity: form.purity,
      grossWeightG: Number(form.grossWeightG || 0),
      netWeightG: Number(form.netWeightG || 0),
      stoneWeightG: Number(form.stoneWeightG || 0),
      diamondWeightG: Number(form.diamondWeightG || 0),
      makingChargeType: form.makingChargeType,
      makingChargeValue: Number(form.makingChargeValue || 0),
      wastagePercent: Number(form.wastagePercent || 0),
      stoneCharges: Number(form.stoneCharges || 0),
      huid: form.huid || undefined,
      purchasePrice: Number(form.purchasePrice || 0),
      sellingPrice: Number(form.sellingPrice || 0),
      stockQty: Number(form.stockQty || 0),
      minStockQty: Number(form.minStockQty || 0),
      status: form.status,
      images: form.images
        .split(",")
        .map((url) => url.trim())
        .filter(Boolean),
      isFeatured: form.isFeatured,
      description: form.description || undefined,
    };

    const response = await fetch(
      product ? `/api/products/${product.id}` : "/api/products",
      {
        method: product ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "We could not save this product. Check the fields and try again.");
      setSaving(false);
      return;
    }
    toast.success(product ? "Product updated" : "Product added to inventory");
    setSaving(false);
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{product ? "Edit product" : "Add a product"}</DialogTitle>
            <DialogDescription>
              Weights are stored in milligrams and money in paise, so billing stays
              exact to the third decimal.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="p-name">Product name</Label>
              <Input
                id="p-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Aurelia Temple Necklace"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.categoryId} onValueChange={(v) => set("categoryId", v)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Showroom</Label>
              <Select value={form.branchId} onValueChange={(v) => set("branchId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All showrooms" />
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
            <div className="space-y-2">
              <Label>Metal</Label>
              <Select value={form.metalType} onValueChange={(v) => set("metalType", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="silver">Silver</SelectItem>
                  <SelectItem value="platinum">Platinum</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Purity</Label>
              <Select value={form.purity} onValueChange={(v) => set("purity", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PURITIES.map((purity) => (
                    <SelectItem key={purity} value={purity}>
                      {purity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-gross">Gross weight (g)</Label>
              <Input
                id="p-gross"
                type="number"
                step="0.001"
                min={0}
                value={form.grossWeightG}
                onChange={(e) => set("grossWeightG", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-net">Net weight (g)</Label>
              <Input
                id="p-net"
                type="number"
                step="0.001"
                min={0}
                value={form.netWeightG}
                onChange={(e) => set("netWeightG", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-stone">Stone weight (g)</Label>
              <Input
                id="p-stone"
                type="number"
                step="0.001"
                min={0}
                value={form.stoneWeightG}
                onChange={(e) => set("stoneWeightG", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-diamond">Diamond weight (g)</Label>
              <Input
                id="p-diamond"
                type="number"
                step="0.001"
                min={0}
                value={form.diamondWeightG}
                onChange={(e) => set("diamondWeightG", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Making charge</Label>
              <Select
                value={form.makingChargeType}
                onValueChange={(v) => set("makingChargeType", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_gram">Per gram (₹)</SelectItem>
                  <SelectItem value="per_piece">Per piece (₹)</SelectItem>
                  <SelectItem value="percent">Percent of metal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-making">
                {form.makingChargeType === "percent" ? "Making (%)" : "Making (₹)"}
              </Label>
              <Input
                id="p-making"
                type="number"
                step="0.01"
                min={0}
                value={form.makingChargeValue}
                onChange={(e) => set("makingChargeValue", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-wastage">Wastage (%)</Label>
              <Input
                id="p-wastage"
                type="number"
                step="0.01"
                min={0}
                max={100}
                value={form.wastagePercent}
                onChange={(e) => set("wastagePercent", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-stonecharge">Stone charges (₹)</Label>
              <Input
                id="p-stonecharge"
                type="number"
                step="0.01"
                min={0}
                value={form.stoneCharges}
                onChange={(e) => set("stoneCharges", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-huid">HUID / hallmark</Label>
              <Input
                id="p-huid"
                value={form.huid}
                onChange={(e) => set("huid", e.target.value)}
                placeholder="Six-character HUID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-stock">Stock quantity</Label>
              <Input
                id="p-stock"
                type="number"
                min={0}
                value={form.stockQty}
                onChange={(e) => set("stockQty", e.target.value)}
                disabled={Boolean(product)}
              />
              {product ? (
                <p className="text-[11px] text-muted-foreground">
                  Use Stock adjustment to change quantities.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-minstock">Reorder level</Label>
              <Input
                id="p-minstock"
                type="number"
                min={0}
                value={form.minStockQty}
                onChange={(e) => set("minStockQty", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-purchase">Purchase price (₹)</Label>
              <Input
                id="p-purchase"
                type="number"
                step="0.01"
                min={0}
                value={form.purchasePrice}
                onChange={(e) => set("purchasePrice", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-selling">Selling price (₹)</Label>
              <Input
                id="p-selling"
                type="number"
                step="0.01"
                min={0}
                value={form.sellingPrice}
                onChange={(e) => set("sellingPrice", e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Leave 0 to price automatically from the live rate.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 sm:col-span-2">
              <div>
                <Label htmlFor="p-featured">Feature on storefront</Label>
                <p className="text-[11px] text-muted-foreground">
                  Shows in the homepage edit.
                </p>
              </div>
              <Switch
                id="p-featured"
                checked={form.isFeatured}
                onCheckedChange={(v) => set("isFeatured", v)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="p-images">Image URLs</Label>
              <Input
                id="p-images"
                value={form.images}
                onChange={(e) => set("images", e.target.value)}
                placeholder="https://…, https://…"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="p-desc">Description</Label>
              <Textarea
                id="p-desc"
                rows={3}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {saving ? "Saving…" : product ? "Save changes" : "Add product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
