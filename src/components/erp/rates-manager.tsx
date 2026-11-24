"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import type { MetalRate } from "@/lib/db/schema";
import { formatDateTime, paise } from "@/lib/format";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/erp/page-header";

const PURITIES = {
  gold: ["24K", "22K", "20K", "18K"],
  silver: ["999"],
  platinum: ["950"],
} as const;

export function UpdateRateDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [metal, setMetal] = useState<"gold" | "silver" | "platinum">("gold");
  const [purity, setPurity] = useState("22K");
  const [rate, setRate] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const response = await fetch("/api/rates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        metal,
        purity,
        ratePerGram: Number(rate),
        note: note || undefined,
      }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "We could not save this rate. Try again.");
      setSaving(false);
      return;
    }
    toast.success(`${purity} ${metal} rate updated`);
    setOpen(false);
    setRate("");
    setNote("");
    setSaving(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-9">
          <Plus className="mr-1.5 size-4" /> Update rate
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Authorise a new rate</DialogTitle>
            <DialogDescription>
              This becomes the live rate for billing and storefront pricing
              immediately. History is preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="metal">Metal</Label>
              <Select
                value={metal}
                onValueChange={(value) => {
                  const next = value as "gold" | "silver" | "platinum";
                  setMetal(next);
                  setPurity(PURITIES[next][0]);
                }}
              >
                <SelectTrigger id="metal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="silver">Silver</SelectItem>
                  <SelectItem value="platinum">Platinum</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="purity">Purity</Label>
              <Select value={purity} onValueChange={setPurity}>
                <SelectTrigger id="purity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PURITIES[metal].map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rate">Rate per gram (₹)</Label>
            <Input
              id="rate"
              type="number"
              inputMode="decimal"
              min={1}
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="9580.00"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="IBJA afternoon rate"
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
              {saving ? "Publishing…" : "Publish rate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RateHistoryTable({ rows }: { rows: MetalRate[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Rate update history</CardTitle>
        <p className="text-xs text-muted-foreground">
          Every authorised change, with the person who published it.
        </p>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-5 py-2.5 font-medium">Published</th>
                <th className="px-3 py-2.5 font-medium">Metal</th>
                <th className="px-3 py-2.5 font-medium">Purity</th>
                <th className="px-3 py-2.5 text-right font-medium">Rate / g</th>
                <th className="px-3 py-2.5 font-medium">Source</th>
                <th className="px-3 py-2.5 font-medium">Published by</th>
                <th className="px-5 py-2.5 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border/60 last:border-0">
                  <td className="px-5 py-3 text-xs text-muted-foreground">
                    {formatDateTime(row.effectiveFrom)}
                  </td>
                  <td className="px-3 py-3 capitalize">{row.metal}</td>
                  <td className="px-3 py-3">{row.purity}</td>
                  <td className="tabular px-3 py-3 text-right font-medium">
                    {paise(row.ratePerGramPaise)}
                  </td>
                  <td className="px-3 py-3 text-xs uppercase text-muted-foreground">
                    {row.source}
                  </td>
                  <td className="px-3 py-3 text-xs">{row.createdBy ?? "System"}</td>
                  <td className="px-5 py-3 text-right">
                    <StatusBadge status={row.isAuthorized ? "active" : "draft"} />
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    No rates published yet. Add the first rate card to start billing.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
