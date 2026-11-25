"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Barcode,
  Download,
  Loader2,
  MoreHorizontal,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { grams, paise } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/erp/page-header";
import {
  ProductFormDialog,
  type ProductRecord,
} from "@/components/erp/product-form-dialog";
import {
  BarcodeDialog,
  StockAdjustDialog,
} from "@/components/erp/stock-barcode-dialogs";

type Option = { id: number; name: string; slug?: string };

type InventoryProduct = ProductRecord & {
  categoryName: string | null;
  categorySlug: string | null;
};

export function InventoryClient({
  products,
  categories,
  branches,
  initialFilters,
}: {
  products: InventoryProduct[];
  categories: Option[];
  branches: Option[];
  initialFilters: { q?: string; category?: string; low?: boolean };
}) {
  const router = useRouter();
  const [search, setSearch] = useState(initialFilters.q ?? "");
  const [category, setCategory] = useState(initialFilters.category ?? "all");
  const [metal, setMetal] = useState("all");
  const [status, setStatus] = useState("all");
  const [lowOnly, setLowOnly] = useState(Boolean(initialFilters.low));

  const [createOpen, setCreateOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<InventoryProduct | null>(null);
  const [adjustProduct, setAdjustProduct] = useState<InventoryProduct | null>(null);
  const [barcodeProduct, setBarcodeProduct] = useState<InventoryProduct | null>(null);
  const [archiveProduct, setArchiveProduct] = useState<InventoryProduct | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [importing, setImporting] = useState<{ done: number; total: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      if (term) {
        const haystack = `${product.name} ${product.sku} ${product.barcode}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (category !== "all" && product.categorySlug !== category) return false;
      if (metal !== "all" && product.metalType !== metal) return false;
      if (status !== "all" && product.status !== status) return false;
      if (lowOnly && product.stockQty > product.minStockQty) return false;
      return true;
    });
  }, [products, search, category, metal, status, lowOnly]);

  const stockValue = filtered.reduce(
    (sum, product) => sum + product.purchasePricePaise * product.stockQty,
    0,
  );
  const lowCount = filtered.filter((p) => p.stockQty <= p.minStockQty).length;
  const totalWeight = filtered.reduce(
    (sum, product) => sum + product.netWeightMg * product.stockQty,
    0,
  );

  function refresh() {
    router.refresh();
  }

  async function exportExcel() {
    const XLSX = await import("xlsx");
    const rows = filtered.map((product) => ({
      SKU: product.sku,
      Barcode: product.barcode,
      Name: product.name,
      Category: product.categoryName ?? "",
      Metal: product.metalType,
      Purity: product.purity,
      "Gross Weight (g)": product.grossWeightMg / 1000,
      "Net Weight (g)": product.netWeightMg / 1000,
      "Making Type": product.makingChargeType,
      "Making Value": product.makingChargeValue / 100,
      "Wastage %": product.wastageBp / 100,
      "Stone Charges": product.stoneChargesPaise / 100,
      "Purchase Price": product.purchasePricePaise / 100,
      "Selling Price": product.sellingPricePaise / 100,
      Stock: product.stockQty,
      "Reorder Level": product.minStockQty,
      Status: product.status,
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Inventory");
    XLSX.writeFile(book, `mitesh-inventory-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`Exported ${rows.length} products`);
  }

  async function importExcel(file: File) {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const book = XLSX.read(buffer);
    const sheet = book.Sheets[book.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    if (!rows.length) {
      toast.error("That sheet has no rows to import.");
      return;
    }
    setImporting({ done: 0, total: rows.length });
    let succeeded = 0;
    let failed = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const categoryName = String(row.Category ?? row.category ?? "");
      const match = categories.find(
        (c) => c.name.toLowerCase() === categoryName.toLowerCase(),
      );
      if (!match) {
        failed++;
        setImporting({ done: i + 1, total: rows.length });
        continue;
      }
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(row.Name ?? row.name ?? ""),
          sku: row.SKU ? String(row.SKU) : undefined,
          barcode: row.Barcode ? String(row.Barcode) : undefined,
          categoryId: match.id,
          metalType: String(row.Metal ?? "gold").toLowerCase(),
          purity: String(row.Purity ?? "22K"),
          grossWeightG: Number(row["Gross Weight (g)"] ?? 0),
          netWeightG: Number(row["Net Weight (g)"] ?? 0),
          makingChargeType: String(row["Making Type"] ?? "per_gram"),
          makingChargeValue: Number(row["Making Value"] ?? 0),
          wastagePercent: Number(row["Wastage %"] ?? 0),
          stoneCharges: Number(row["Stone Charges"] ?? 0),
          purchasePrice: Number(row["Purchase Price"] ?? 0),
          sellingPrice: Number(row["Selling Price"] ?? 0),
          stockQty: Number(row.Stock ?? 0),
          minStockQty: Number(row["Reorder Level"] ?? 3),
          status: "active",
          images: [],
          tags: [],
          isFeatured: false,
        }),
      });
      if (response.ok) succeeded++;
      else failed++;
      setImporting({ done: i + 1, total: rows.length });
    }
    setImporting(null);
    if (fileRef.current) fileRef.current.value = "";
    if (succeeded) toast.success(`Imported ${succeeded} products`);
    if (failed) toast.error(`${failed} rows skipped — check the category names and fields.`);
    refresh();
  }

  async function archive() {
    if (!archiveProduct) return;
    setArchiving(true);
    const response = await fetch(`/api/products/${archiveProduct.id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("We could not archive this product. Try again.");
      setArchiving(false);
      return;
    }
    toast.success(`${archiveProduct.name} archived`);
    setArchiving(false);
    setArchiveProduct(null);
    refresh();
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, SKU or barcode"
              className="h-9 pl-9"
              aria-label="Search inventory"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.slug ?? String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={metal} onValueChange={setMetal}>
              <SelectTrigger className="h-9 w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All metals</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
                <SelectItem value="platinum">Platinum</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <label className="flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs text-muted-foreground">
              <Switch checked={lowOnly} onCheckedChange={setLowOnly} aria-label="Low stock only" />
              Low stock
            </label>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <span>
              <span className="tabular font-medium text-foreground">{filtered.length}</span> SKUs
            </span>
            <span>
              Stock at cost{" "}
              <span className="tabular font-medium text-foreground">{paise(stockValue)}</span>
            </span>
            <span>
              Net weight{" "}
              <span className="tabular font-medium text-foreground">{grams(totalWeight, 1)}</span>
            </span>
            <span className="flex items-center gap-1">
              <AlertTriangle className="size-3.5 text-amber-600" />
              <span className="tabular font-medium text-foreground">{lowCount}</span> low stock
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importExcel(file);
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => fileRef.current?.click()}
              disabled={Boolean(importing)}
            >
              {importing ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Upload className="mr-1.5 size-3.5" />
              )}
              {importing ? `Importing ${importing.done}/${importing.total}` : "Import"}
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={exportExcel}>
              <Download className="mr-1.5 size-3.5" /> Export
            </Button>
            <Button size="sm" className="h-8" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 size-3.5" /> Add product
            </Button>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-3 py-3 font-medium">Category</th>
                <th className="px-3 py-3 font-medium">Purity</th>
                <th className="px-3 py-3 text-right font-medium">Net wt</th>
                <th className="px-3 py-3 text-right font-medium">Stock</th>
                <th className="px-3 py-3 text-right font-medium">Selling</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const low = product.stockQty <= product.minStockQty;
                return (
                  <tr key={product.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                          {product.images[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.images[0]}
                              alt=""
                              className="size-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <SlidersHorizontal className="size-4 text-muted-foreground" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <Link
                            href={`/inventory/${product.id}`}
                            className="line-clamp-1 font-medium hover:underline"
                          >
                            {product.name}
                          </Link>
                          <p className="text-[11px] text-muted-foreground">
                            {product.sku} · {product.barcode}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {product.categoryName}
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant="outline" className="rounded-full text-[10px] capitalize">
                        {product.purity} {product.metalType}
                      </Badge>
                    </td>
                    <td className="tabular px-3 py-3 text-right text-xs">
                      {grams(product.netWeightMg)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className={`tabular text-sm ${low ? "font-medium text-amber-700 dark:text-amber-400" : ""}`}>
                        {product.stockQty}
                      </span>
                      <p className="text-[10px] text-muted-foreground">reorder {product.minStockQty}</p>
                    </td>
                    <td className="tabular px-3 py-3 text-right">{paise(product.sellingPricePaise)}</td>
                    <td className="px-3 py-3">
                      <StatusBadge status={product.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${product.name}`}>
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => setEditProduct(product)}>
                            <Pencil className="mr-2 size-4" /> Edit product
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setAdjustProduct(product)}>
                            <PackagePlus className="mr-2 size-4" /> Adjust stock
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setBarcodeProduct(product)}>
                            <Barcode className="mr-2 size-4" /> Barcode label
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setArchiveProduct(product)}
                          >
                            Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center">
                    <p className="text-sm font-medium">No products match these filters</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Clear the filters, or add a new piece to the catalogue.
                    </p>
                    <Button size="sm" className="mt-4" onClick={() => setCreateOpen(true)}>
                      <Plus className="mr-1.5 size-3.5" /> Add product
                    </Button>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <ProductFormDialog
        key={editProduct?.id ?? "new"}
        open={createOpen || Boolean(editProduct)}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setEditProduct(null);
          }
        }}
        product={editProduct}
        categories={categories}
        branches={branches}
        onSaved={refresh}
      />
      <StockAdjustDialog
        open={Boolean(adjustProduct)}
        onOpenChange={(open) => !open && setAdjustProduct(null)}
        product={adjustProduct}
        onSaved={refresh}
      />
      <BarcodeDialog
        open={Boolean(barcodeProduct)}
        onOpenChange={(open) => !open && setBarcodeProduct(null)}
        product={barcodeProduct}
      />
      <AlertDialog open={Boolean(archiveProduct)} onOpenChange={(open) => !open && setArchiveProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {archiveProduct?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The product stays in past invoices but is hidden from billing and the
              storefront. You can restore it later by editing its status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep product</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                archive();
              }}
              disabled={archiving}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {archiving ? "Archiving…" : "Archive product"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
