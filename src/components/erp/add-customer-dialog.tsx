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

export function AddCustomerDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    email: "",
    city: "",
    dateOfBirth: "",
    anniversary: "",
    preferences: "",
    notes: "",
  });

  function set(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const response = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        mobile: form.mobile,
        email: form.email || undefined,
        city: form.city || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        anniversary: form.anniversary || undefined,
        preferences: form.preferences || undefined,
        notes: form.notes || undefined,
      }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "We could not add this customer.");
      setSaving(false);
      return;
    }
    toast.success(`${form.name} added to the customer book`);
    setSaving(false);
    setOpen(false);
    setForm({
      name: "",
      mobile: "",
      email: "",
      city: "",
      dateOfBirth: "",
      anniversary: "",
      preferences: "",
      notes: "",
    });
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-9">
          <Plus className="mr-1.5 size-4" /> Add customer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add a customer</DialogTitle>
            <DialogDescription>
              Birthdays and anniversaries drive reminders and campaign lists.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="c-name">Full name</Label>
              <Input
                id="c-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-mobile">Mobile</Label>
              <Input
                id="c-mobile"
                type="tel"
                inputMode="tel"
                maxLength={10}
                value={form.mobile}
                onChange={(e) => set("mobile", e.target.value.replace(/\D/g, ""))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-email">Email</Label>
              <Input
                id="c-email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-city">City</Label>
              <Input id="c-city" value={form.city} onChange={(e) => set("city", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-dob">Birthday</Label>
              <Input
                id="c-dob"
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => set("dateOfBirth", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-anniv">Anniversary</Label>
              <Input
                id="c-anniv"
                type="date"
                value={form.anniversary}
                onChange={(e) => set("anniversary", e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="c-pref">Preferences</Label>
              <Input
                id="c-pref"
                value={form.preferences}
                onChange={(e) => set("preferences", e.target.value)}
                placeholder="Prefers 22K bridal sets, antique finish…"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="c-notes">Notes</Label>
              <Textarea
                id="c-notes"
                rows={2}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>
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
              {saving ? "Saving…" : "Add customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
