"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Loader2, Plus, Search, Wrench } from "lucide-react";
import { toast } from "sonner";
import { formatDate, paise, weightValue } from "@/lib/format";
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
import { StatusBadge } from "@/components/erp/page-header";

type Row = {
  id: number;
  jobNo: string;
  customerName: string | null;
  mobile: string | null;
  itemDescription: string;
  metalType: string;
  grossWeightMg: number;
  estimatedCostPaise: number;
  advancePaise: number;
  status: string;
  receivedAt: string;
  promisedAt: string | null;
  assignedTo: string | null;
};

const NEXT_STATUS: Record<string, { next: string; label: string } | undefined> = {
  received: { next: "in_progress", label: "Start work" },
  in_progress: { next: "ready", label: "Mark ready" },
  ready: { next: "delivered", label: "Deliver" },
};

const TABS = [
  { key: "all", label: "All jobs" },
  { key: "received", label: "Received" },
  { key: "in_progress", label: "In progress" },
  { key: "ready", label: "Ready" },
  { key: "delivered", label: "Delivered" },
];

export function RepairsClient({
  rows,
  customers,
  branches,
}: {
  rows: Row[];
  customers: { id: number; name: string; mobile: string }[];
  branches: { id: number; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");

  const [customerId, setCustomerId] = useState("walk-in");
  const [branchId, setBranchId] = useState(branches[0] ? String(branches[0].id) : "");
  const [item, setItem] = useState("");
  const [metal, setMetal] = useState("gold");
  const [weight, setWeight] = useState("");
  const [issue, setIssue] = useState("");
  const [cost, setCost] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [promised, setPromised] = useState("");
  const [assigned, setAssigned] = useState("");
  const [notes, setNotes] = useState("");

  function reset() {
    setCustomerId("walk-in");
    setItem("");
    setMetal("gold");
    setWeight("");
    setIssue("");
    setCost("");
    setAdvanceAmount("");
    setPromised("");
    setAssigned("");
    setNotes("");
    setError(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const response = await fetch("/api/repairs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: customerId === "walk-in" ? null : Number(customerId),
        branchId: branchId ? Number(branchId) : null,
        itemDescription: item,
        metalType: metal,
        grossWeightMg: Math.round(Number(weight || 0) * 1000),
        issue: issue || undefined,
        estimatedCostPaise: Math.round(Number(cost || 0) * 100),
        advancePaise: Math.round(Number(advanceAmount || 0) * 100),
        promisedAt: promised || undefined,
        assignedTo: assigned || undefined,
        notes: notes || undefined,
      }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "We could not create this job.");
      setSaving(false);
      return;
    }
    toast.success("Repair job created");
    setSaving(false);
    setOpen(false);
    reset();
    router.refresh();
  }

  async function advance(row: Row) {
    const step = NEXT_STATUS[row.status];
    if (!step) return;
    setBusyId(row.id);
    const response = await fetch(`/api/repairs/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: step.next }),
    });
    const payload = (await response.json()) as { error?: string };
    setBusyId(null);
    if (!response.ok) {
      toast.error(payload.error ?? "Could not update the job.");
      return;
    }
    toast.success(`${row.jobNo} → ${step.next.replace("_", " ")}`);
    router.refresh();
  }

  const filtered = rows.filter((row) => {
    if (tab !== "all" && row.status !== tab) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      row.jobNo.toLowerCase().includes(q) ||
      row.itemDescription.toLowerCase().includes(q) ||
      (row.customerName ?? "").toLowerCase().includes(q) ||
      (row.mobile ?? "").includes(q)
    );
  });

  return (
    <>
      <div className="mt-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => {
            const active = tab === t.key;
            const count = t.key === "all" ? rows.length : rows.filter((r) => r.status === t.key).length;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`h-9 rounded-full px-3 text-xs font-medium transition-colors ${
                  active
                    ? "bg-foreground text-background"
                    : "border border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {t.label}
                <span className={`ml-1.5 tabular ${active ? "opacity-70" : "opacity-60"}`}>{count}</span>
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search jobs or customers"
              className="h-9 pl-9"
            />
          </div>
          <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
            <DialogTrigger asChild>
              <Button className="h-9">
                <Plus className="mr-1.5 size-4" /> New job
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
              <form onSubmit={submit} className="space-y-4">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Wrench className="size-4 text-gold-deep" /> New repair job
                  </DialogTitle>
                  <DialogDescription>
                    Record the item as received so the workshop and the customer both have a trail.
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
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="rp-item">Item</Label>
                    <Input
                      id="rp-item"
                      value={item}
                      onChange={(e) => setItem(e.target.value)}
                      placeholder="22K gold chain, 8.4 g"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Metal</Label>
                    <Select value={metal} onValueChange={setMetal}>
                      <SelectTrigger className="h-9">
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
                    <Label htmlFor="rp-weight">Weight (g)</Label>
                    <Input
                      id="rp-weight"
                      type="number"
                      step="0.001"
                      min="0"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="rp-issue">Issue / work needed</Label>
                    <Textarea
                      id="rp-issue"
                      rows={2}
                      value={issue}
                      onChange={(e) => setIssue(e.target.value)}
                      placeholder="Clasp broken, needs soldering and polish."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rp-cost">Estimate (₹)</Label>
                    <Input
                      id="rp-cost"
                      type="number"
                      min="0"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rp-adv">Advance (₹)</Label>
                    <Input
                      id="rp-adv"
                      type="number"
                      min="0"
                      value={advanceAmount}
                      onChange={(e) => setAdvanceAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rp-promised">Promised date</Label>
                    <Input
                      id="rp-promised"
                      type="date"
                      value={promised}
                      onChange={(e) => setPromised(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rp-assign">Assigned to</Label>
                    <Input
                      id="rp-assign"
                      value={assigned}
                      onChange={(e) => setAssigned(e.target.value)}
                      placeholder="Karigar name"
                    />
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
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
                    Create job
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="mt-3 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-4 py-3 font-medium">Job</th>
                <th className="px-3 py-3 font-medium">Customer</th>
                <th className="px-3 py-3 font-medium">Item</th>
                <th className="px-3 py-3 text-right font-medium">Weight</th>
                <th className="px-3 py-3 text-right font-medium">Estimate</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const step = NEXT_STATUS[row.status];
                return (
                  <tr key={row.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.jobNo}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDate(row.receivedAt)}
                        {row.promisedAt ? ` · due ${formatDate(row.promisedAt)}` : ""}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-xs">{row.customerName ?? "Walk-in"}</p>
                      {row.mobile ? <p className="text-[11px] text-muted-foreground">{row.mobile}</p> : null}
                    </td>
                    <td className="px-3 py-3">
                      <p className="max-w-[220px] truncate text-xs">{row.itemDescription}</p>
                      <p className="text-[11px] capitalize text-muted-foreground">
                        {row.metalType}
                        {row.assignedTo ? ` · ${row.assignedTo}` : ""}
                      </p>
                    </td>
                    <td className="tabular px-3 py-3 text-right text-xs">
                      {weightValue(row.grossWeightMg)} g
                    </td>
                    <td className="tabular px-3 py-3 text-right text-xs">
                      {paise(row.estimatedCostPaise)}
                      {row.advancePaise > 0 ? (
                        <span className="block text-[10px] text-muted-foreground">
                          {paise(row.advancePaise)} adv
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {step ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          disabled={busyId === row.id}
                          onClick={() => advance(row)}
                        >
                          {busyId === row.id ? (
                            <Loader2 className="mr-1 size-3.5 animate-spin" />
                          ) : step.next === "delivered" ? (
                            <CheckCircle2 className="mr-1 size-3.5" />
                          ) : (
                            <ArrowRight className="mr-1 size-3.5" />
                          )}
                          {step.label}
                        </Button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          {row.status === "delivered" ? "Closed" : "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!filtered.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <p className="text-sm font-medium">No repair jobs here</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Change the filter, or log a new job at the counter.
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
