"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Barcode, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BarcodeDialog,
  StockAdjustDialog,
} from "@/components/erp/stock-barcode-dialogs";
import type { ProductRecord } from "@/components/erp/product-form-dialog";

export function InventoryDetailActions({ product }: { product: ProductRecord }) {
  const router = useRouter();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [barcodeOpen, setBarcodeOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" className="h-9" onClick={() => setBarcodeOpen(true)}>
        <Barcode className="mr-2 size-4" /> Label
      </Button>
      <Button size="sm" className="h-9" onClick={() => setAdjustOpen(true)}>
        <PackagePlus className="mr-2 size-4" /> Adjust stock
      </Button>
      <StockAdjustDialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        product={product}
        onSaved={() => router.refresh()}
      />
      <BarcodeDialog open={barcodeOpen} onOpenChange={setBarcodeOpen} product={product} />
    </>
  );
}
