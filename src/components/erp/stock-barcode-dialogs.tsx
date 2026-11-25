"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Printer, QrCode } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { paise } from "@/lib/format";
import type { ProductRecord } from "./product-form-dialog";

export function StockAdjustDialog({
  open,
  onOpenChange,
  product,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductRecord | null;
  onSaved: () => void;
}) {
  const [qty, setQty] = useState("");
  const [type, setType] = useState("adjustment");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setQty("");
      setNote("");
      setType("adjustment");
      setError(null);
    }
  }, [open]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!product) return;
    setSaving(true);
    setError(null);
    const response = await fetch(`/api/products/${product.id}/stock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qtyChange: Number(qty), type, note: note || undefined }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "We could not adjust stock. Try again.");
      setSaving(false);
      return;
    }
    toast.success(`Stock updated for ${product.sku}`);
    setSaving(false);
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Adjust stock</DialogTitle>
            <DialogDescription>
              {product ? `${product.name} · ${product.sku} · ${product.stockQty} in stock` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="adj-qty">Quantity change</Label>
            <Input
              id="adj-qty"
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="-1 to remove, 5 to add"
              required
            />
            <p className="text-xs text-muted-foreground">
              Use negative numbers for shrinkage or returns to vendor.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="adjustment">Physical count adjustment</SelectItem>
                <SelectItem value="transfer_in">Transfer in</SelectItem>
                <SelectItem value="transfer_out">Transfer out</SelectItem>
                <SelectItem value="return">Customer return</SelectItem>
                <SelectItem value="purchase">Purchase receipt</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="adj-note">Note</Label>
            <Input
              id="adj-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Verified during monthly stock count"
            />
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
              {saving ? "Adjusting…" : "Apply adjustment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BarcodeDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductRecord | null;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !product) return;
    let active = true;
    setQr(null);
    (async () => {
      const QR = await import("qrcode");
      const url = await QR.toDataURL(
        JSON.stringify({ sku: product.sku, barcode: product.barcode }),
        { width: 220, margin: 1, color: { dark: "#211b15", light: "#ffffff" } },
      );
      if (active) setQr(url);
      const JsBarcode = (await import("jsbarcode")).default;
      if (active && svgRef.current) {
        JsBarcode(svgRef.current, product.barcode, {
          format: "CODE128",
          displayValue: true,
          fontSize: 12,
          height: 52,
          margin: 4,
          lineColor: "#211b15",
        });
      }
    })();
    return () => {
      active = false;
    };
  }, [open, product]);

  function printLabel() {
    if (!product || !qr || !svgRef.current) return;
    const win = window.open("", "_blank", "width=420,height=560");
    if (!win) {
      toast.error("Allow pop-ups to print the label.");
      return;
    }
    win.document.write(`
      <html><head><title>${product.sku}</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:18px;color:#211b15}
        h1{font-size:14px;margin:0 0 2px}
        p{font-size:11px;margin:0;color:#555}
        .row{display:flex;gap:14px;align-items:center;margin-top:10px}
        img{width:88px;height:88px}
        .meta{margin-top:8px;font-size:11px;display:flex;justify-content:space-between}
        svg{max-width:100%}
      </style></head><body>
      <h1>Mitesh Jewellers</h1>
      <p>${product.name}</p>
      <div class="row"><img src="${qr}" /><div>${svgRef.current.outerHTML}</div></div>
      <div class="meta"><span>${product.purity} ${product.metalType} · ${(product.netWeightMg / 1000).toFixed(3)} g</span><span>${paise(product.sellingPricePaise)}</span></div>
      <div class="meta"><span>SKU ${product.sku}</span><span>BIS Hallmarked</span></div>
      <script>window.onload=()=>{window.print();}</script>
      </body></html>`);
    win.document.close();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Barcode & QR label</DialogTitle>
          <DialogDescription>
            {product ? `${product.name} · ${product.sku}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border p-6">
          {qr ? (
            <img src={qr} alt={`QR code for ${product?.sku ?? "product"}`} className="size-32" />
          ) : (
            <div className="flex size-32 items-center justify-center rounded-md bg-muted">
              <QrCode className="size-8 text-muted-foreground" />
            </div>
          )}
          <svg ref={svgRef} className="max-w-full" />
          <div className="w-full border-t border-border pt-3 text-center">
            <p className="text-sm font-medium">{product?.name}</p>
            <p className="text-xs text-muted-foreground">
              {product ? `${product.purity} ${product.metalType} · ${(product.netWeightMg / 1000).toFixed(3)} g` : ""}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={printLabel} disabled={!qr}>
            <Printer className="mr-2 size-4" /> Print label
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
