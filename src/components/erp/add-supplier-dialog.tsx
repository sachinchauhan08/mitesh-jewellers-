"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";

const EMPTY = {
  name: "",
  contactPerson: "",
  mobile: "",
  email: "",
  gstin: "",
  city: "",
  state: "",
  address: "",
};

export function AddSupplierDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);

  function set(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const response = await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        contactPerson: form.contactPerson || undefined,
        mobile: form.mobile || undefined,
        email: form.email || undefined,
        gstin: form.gstin || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        address: form.address || undefined,
      }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "We could not add this supplier.");
      setSaving(false);
      return;
    }
    toast.success(`${form.name} added to suppliers`);
    setSaving(false);
    setOpen(false);
    setForm(EMPTY);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-9">
          <Plus className="mr-1.5 size-4" /> Add supplier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add a supplier</DialogTitle>
            <DialogDescription>
              Bullion dealers, karigars and trade partners you buy from.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="s-name">Business name</Label>
              <Input id="s-name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-contact">Contact person</Label>
              <Input
                id="s-contact"
                value={form.contactPerson}
                onChange={(e) => set("contactPerson", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-mobile">Mobile</Label>
              <Input
                id="s-mobile"
                type="tel"
                inputMode="tel"
                value={form.mobile}
                onChange={(e) => set("mobile", e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-email">Email</Label>
              <Input id="s-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-gst">GSTIN</Label>
              <Input
                id="s-gst"
                value={form.gstin}
                onChange={(e) => set("gstin", e.target.value.toUpperCase())}
                maxLength={15}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-city">City</Label>
              <Input id="s-city" value={form.city} onChange={(e) => set("city", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-state">State</Label>
              <Input id="s-state" value={form.state} onChange={(e) => set("state", e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="s-address">Address</Label>
              <Textarea
                id="s-address"
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
              Save supplier
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
