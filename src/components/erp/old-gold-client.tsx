"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calculator, Coins, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { estimateOldGold } from "@/lib/pricing";
import { formatDate, grams, paise, percentToBp, weightValue } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

type Row = {
  id: number;
  receiptNo: string;
  customerName: string | null;
  grossWeightMg: number;
  netWeightMg: number;
  purityBp: number;
  ratePerGramPaise: number;
  finalValuePaise: number;
  settlementType: string;
  date: string;
};

type Props = {
  rows: Row[];
  customers: { id: number; name: string; mobile: string }[];
  branches: { id: number; name: string }[];
  goldRate22: number;
  goldRate24: number;
};

const PURITIES = [
  { label: "24K (999)", bp: 10000 },
  { label: "22K (916)", bp: 9160 },
  { label: "20K (833)", bp: 8330 },
  { label: "18K (750)", bp: 7500 },
  { label: "14K (585)", bp: 5850 },
];

export function OldGoldClient({ rows, customers, branches, goldRate22, goldRate24 }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [customerId, setCustomerId] = useState("walk-in");
  const [branchId, setBranchId] = useState(branches[0] ? String(branches[0].id) : "");
  const [gross, setGross] = useState("");
  const [purityBp, setPurityBp] = useState("9160");
  const [melting, setMelting] = useState("2");
  const [deduction, setDeduction] = useState("0");
  const [rate, setRate] = useState(String(goldRate22 || goldRate24));
  const [settlement, setSettlement] = useState("cash");
  const [notes, setNotes] = useState("");

  const estimate = useMemo(() => {
    const grossMg = Math.round(Number(gross || 0) * 1000);
    return estimateOldGold({
      grossWeightMg: grossMg,
      purityBp: Number(purityBp),
      meltingLossBp: percentToBp(melting),
      ratePerGramPaise: Number(rate || 0),
      deductionBp: percentToBp(deduction),
    });
  }, [gross, purityBp, melting, deduction, rate]);

  function reset() {
    setCustomerId("walk-in");
    setGross("");
    setPurityBp("9160");
    setMelting("2");
    setDeduction("0");
    setRate(String(goldRate22 || goldRate24));
    setSettlement("cash");
    setNotes("");
    setError(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const response = await fetch("/api/old-gold", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: customerId === "walk-in" ? null : Number(customerId),
        branchId: branchId ? Number(branchId) : null,
        grossWeightMg: Math.round(Number(gross || 0) * 1000),
        purityBp: Number(purityBp),
        meltingLossBp: percentToBp(melting),
        deductionBp: percentToBp(deduction),
        ratePerGramPaise: Number(rate || 0),
        settlementType: settlement,
        notes: notes || undefined,
      }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "We could not save this receipt.");
      setSaving(false);
      return;
    }
    toast.success("Old-gold receipt created");
    setSaving(false);
    setOpen(false);
    reset();
    router.refresh();
  }

  const filtered = rows.filter((row) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      row.receiptNo.toLowerCase().includes(q) ||
      (row.customerName ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search receipt or customer"
            className="h-9 pl-9"
          />
        </div>
        <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
          <DialogTrigger asChild>
            <Button className="h-9">
              <Plus className="mr-1.5 size-4" /> New receipt
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
            <form onSubmit={submit} className="space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Coins className="size-4 text-gold-deep" /> Value old gold
                </DialogTitle>
                <DialogDescription>
                  Enter the tested weight and purity. The payout updates live before you save.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Customer</Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Walk-in customer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walk-in">Walk-in customer</SelectItem>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name} · {c.mobile}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="og-gross">Gross weight (g)</Label>
                  <Input
                    id="og-gross"
                    type="number"
                    step="0.001"
                    min="0"
                    inputMode="decimal"
                    value={gross}
                    onChange={(e) => setGross(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Purity</Label>
                  <Select value={purityBp} onValueChange={setPurityBp}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PURITIES.map((p) => (
                        <SelectItem key={p.bp} value={String(p.bp)}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="og-melt">Melting loss (%)</Label>
                  <Input
                    id="og-melt"
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    value={melting}
                    onChange={(e) => setMelting(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="og-ded">Deduction (%)</Label>
                  <Input
                    id="og-ded"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={deduction}
                    onChange={(e) => setDeduction(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="og-rate">Rate per gram (₹)</Label>
                  <Input
                    id="og-rate"
                    type="number"
                    step="1"
                    min="0"
                    value={rate ? String(Number(rate) / 100) : ""}
                    onChange={(e) => setRate(String(Math.round(Number(e.target.value || 0) * 100)))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Settlement</Label>
                  <Select value={settlement} onValueChange={setSettlement}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank">Bank transfer</SelectItem>
                      <SelectItem value="exchange">Exchange on purchase</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Branch</Label>
                  <Select value={branchId} onValueChange={setBranchId}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="og-notes">Notes</Label>
                  <Textarea
                    id="og-notes"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Customer ID proof seen, chain broken at clasp…"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-gold/30 bg-gold-soft/50 p-4">
                <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-gold-deep">
                  <Calculator className="size-3.5" /> Live valuation
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <span className="text-muted-foreground">Net weight</span>
                  <span className="tabular text-right font-medium">{grams(estimate.netWeightMg)}</span>
                  <span className="text-muted-foreground">Gross metal value</span>
                  <span className="tabular text-right">{paise(estimate.grossValue)}</span>
                  <span className="text-muted-foreground">Payout after deduction</span>
                  <span className="tabular text-right text-base font-semibold text-gold-deep">
                    {paise(estimate.finalValuePaise)}
                  </span>
                </div>
              </div>

              {error ? (
                <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </p>
              ) : null}

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving || estimate.finalValuePaise <= 0}>
                  {saving ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
                  Save receipt
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mt-3 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-4 py-3 font-medium">Receipt</th>
                <th className="px-3 py-3 font-medium">Customer</th>
                <th className="px-3 py-3 text-right font-medium">Gross</th>
                <th className="px-3 py-3 text-right font-medium">Net</th>
                <th className="px-3 py-3 text-right font-medium">Rate/g</th>
                <th className="px-3 py-3 font-medium">Settlement</th>
                <th className="px-4 py-3 text-right font-medium">Payout</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.receiptNo}</p>
                    <p className="text-[11px] text-muted-foreground">{formatDate(row.date)}</p>
                  </td>
                  <td className="px-3 py-3 text-xs">{row.customerName ?? "Walk-in"}</td>
                  <td className="tabular px-3 py-3 text-right text-xs">{weightValue(row.grossWeightMg)} g</td>
                  <td className="tabular px-3 py-3 text-right text-xs">{weightValue(row.netWeightMg)} g</td>
                  <td className="tabular px-3 py-3 text-right text-xs">{paise(row.ratePerGramPaise)}</td>
                  <td className="px-3 py-3 text-xs capitalize text-muted-foreground">{row.settlementType}</td>
                  <td className="tabular px-4 py-3 text-right font-medium">{paise(row.finalValuePaise)}</td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <p className="text-sm font-medium">No old-gold receipts</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Value a customer&apos;s gold to start the buy-back register.
                    </p>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
