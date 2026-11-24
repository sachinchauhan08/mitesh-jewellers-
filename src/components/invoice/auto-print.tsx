"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AutoPrint({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => window.print(), 500);
    return () => clearTimeout(timer);
  }, [enabled]);
  return null;
}

export function PrintButton() {
  return (
    <Button onClick={() => window.print()} className="print:hidden">
      <Printer className="mr-2 size-4" /> Print invoice
    </Button>
  );
}
