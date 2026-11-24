"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ReportExport({
  rows,
  filename,
}: {
  rows: Record<string, string | number>[];
  filename: string;
}) {
  const [busy, setBusy] = useState(false);

  async function download() {
    if (!rows.length) {
      toast.error("There are no rows to export for this period.");
      return;
    }
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const sheet = XLSX.utils.json_to_sheet(rows);
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, "Sales");
      XLSX.writeFile(book, `${filename}.xlsx`);
      toast.success("Report downloaded");
    } catch {
      toast.error("Could not build the spreadsheet. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" className="h-9 bg-card" onClick={download} disabled={busy}>
      {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Download className="mr-1.5 size-4" />}
      Export Excel
    </Button>
  );
}
