"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Plus, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { bpToPercent, percentToBp } from "@/lib/format";
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

type Values = {
  company_name: string;
  company_address: string;
  company_gstin: string;
  company_phone: string;
  company_email: string;
  gst_rate_bp: string;
  weight_precision: string;
  loyalty_rate_bp: string;
  invoice_footer: string;
};

type Branch = {
  id: number;
  name: string;
  code: string;
  city: string | null;
  phone: string | null;
  gstin: string | null;
};

export function SettingsClient({
  initial,
  branches,
}: {
  initial: Values;
  branches: Branch[];
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: keyof Values, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_name: form.company_name,
        company_address: form.company_address,
        company_gstin: form.company_gstin,
        company_phone: form.company_phone,
        company_email: form.company_email,
        gst_rate_bp: percentToBp(form.gst_rate_bp),
        weight_precision: Number(form.weight_precision),
        loyalty_rate_bp: percentToBp(form.loyalty_rate_bp),
        invoice_footer: form.invoice_footer,
      }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "We could not save these settings.");
      setSaving(false);
      return;
    }
    toast.success("Settings saved");
    setSaving(false);
    router.refresh();
  }

  return (
    <form onSubmit={save} className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-4">
        <Card className="p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Building2 className="size-4 text-gold-deep" /> Company identity
          </h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Appears on invoices, estimates and the storefront footer.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="co-name">Legal name</Label>
              <Input id="co-name" value={form.company_name} onChange={(e) => set("company_name", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="co-gst">GSTIN</Label>
              <Input
                id="co-gst"
                value={form.company_gstin}
                maxLength={15}
                onChange={(e) => set("company_gstin", e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="co-phone">Phone</Label>
              <Input id="co-phone" value={form.company_phone} onChange={(e) => set("company_phone", e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="co-email">Email</Label>
              <Input
                id="co-email"
                type="email"
                value={form.company_email}
                onChange={(e) => set("company_email", e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="co-address">Registered address</Label>
              <Textarea
                id="co-address"
                rows={2}
                value={form.company_address}
                onChange={(e) => set("company_address", e.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="size-4 text-gold-deep" /> Tax &amp; pricing
          </h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Defaults applied to new bills. Existing invoices keep the rate they were billed at.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="co-gst-rate">Default GST (%)</Label>
              <Input
                id="co-gst-rate"
                type="number"
                step="0.01"
                min="0"
                max="28"
                value={bpToPercent(Number(form.gst_rate_bp)).replace("%", "")}
                onChange={(e) => set("gst_rate_bp", String(percentToBp(e.target.value)))}
              />
            </div>
            <div className="space-y-2">
              <Label>Weight precision</Label>
              <Select value={form.weight_precision} onValueChange={(v) => set("weight_precision", v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 decimal (0.1 g)</SelectItem>
                  <SelectItem value="2">2 decimals (0.01 g)</SelectItem>
                  <SelectItem value="3">3 decimals (0.001 g)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="co-loyalty">Loyalty earn rate (%)</Label>
              <Input
                id="co-loyalty"
                type="number"
                step="0.01"
                min="0"
                value={bpToPercent(Number(form.loyalty_rate_bp)).replace("%", "")}
                onChange={(e) => set("loyalty_rate_bp", String(percentToBp(e.target.value)))}
              />
              <p className="text-[10px] text-muted-foreground">
                Points awarded as a share of invoice value.
              </p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="co-footer">Invoice footer</Label>
              <Textarea
                id="co-footer"
                rows={2}
                value={form.invoice_footer}
                onChange={(e) => set("invoice_footer", e.target.value)}
              />
            </div>
          </div>
        </Card>

        {error ? (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={saving} className="h-10">
          {saving ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Save className="mr-1.5 size-4" />}
          Save settings
        </Button>
      </div>

      <Card className="h-fit p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Building2 className="size-4 text-gold-deep" /> Showrooms
            </h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {branches.length} branch{branches.length === 1 ? "" : "es"} on record
            </p>
          </div>
          <AddBranchDialog onSaved={() => router.refresh()} />
        </div>
        <ul className="mt-4 space-y-2">
          {branches.map((branch) => (
            <li key={branch.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold">{branch.name}</p>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">{branch.code}</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {[branch.city, branch.phone, branch.gstin].filter(Boolean).join(" · ") || "No details yet"}
              </p>
            </li>
          ))}
        </ul>
      </Card>
    </form>
  );
}

function AddBranchDialog({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", code: "", city: "", phone: "", gstin: "", address: "" });

  function set(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const response = await fetch("/api/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        code: form.code,
        city: form.city || undefined,
        phone: form.phone || undefined,
        gstin: form.gstin || undefined,
        address: form.address || undefined,
      }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "We could not add this showroom.");
      setSaving(false);
      return;
    }
    toast.success("Showroom added");
    setSaving(false);
    setOpen(false);
    setForm({ name: "", code: "", city: "", phone: "", gstin: "", address: "" });
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="h-8">
          <Plus className="mr-1 size-3.5" /> Add
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add a showroom</DialogTitle>
            <DialogDescription>Branches scope stock, staff postings and daily reports.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="br-name">Showroom name</Label>
              <Input id="br-name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="br-code">Code</Label>
              <Input
                id="br-code"
                value={form.code}
                onChange={(e) => set("code", e.target.value.toUpperCase())}
                maxLength={20}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="br-city">City</Label>
              <Input id="br-city" value={form.city} onChange={(e) => set("city", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="br-phone">Phone</Label>
              <Input id="br-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="br-gst">GSTIN</Label>
              <Input
                id="br-gst"
                value={form.gstin}
                maxLength={15}
                onChange={(e) => set("gstin", e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="br-address">Address</Label>
              <Textarea
                id="br-address"
                rows={2}
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
              />
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
              Add showroom
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
