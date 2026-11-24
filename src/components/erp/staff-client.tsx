"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Pencil, Plus, ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { ROLE_LABELS } from "@/lib/roles";
import { bpToPercent, compactPaise, formatDate, initials, paise, percentToBp } from "@/lib/format";
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

type Staff = {
  userId: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  designation: string | null;
  branchId: number | null;
  commissionBp: number;
  salesTargetPaise: number;
  joinedAt: string | null;
  isActive: boolean;
  salesPaise: number;
  isSelf: boolean;
};

const ROLES = ["admin", "manager", "accountant", "cashier", "salesman"];

export function StaffClient({
  staff,
  branches,
  canCreate,
}: {
  staff: Staff[];
  branches: { id: number; name: string }[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Staff | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {staff.length} team member{staff.length === 1 ? "" : "s"} · commission is a share of sales
        </p>
        {canCreate ? (
          <Button className="h-9" onClick={() => setAdding(true)}>
            <UserPlus className="mr-1.5 size-4" /> Add staff
          </Button>
        ) : null}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {staff.map((member) => {
          const branch = branches.find((b) => b.id === member.branchId);
          const progress =
            member.salesTargetPaise > 0
              ? Math.min(100, Math.round((member.salesPaise / member.salesTargetPaise) * 100))
              : 0;
          const commission = Math.round((member.salesPaise * member.commissionBp) / 10000);
          return (
            <Card key={member.userId} className="p-4">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gold-soft text-sm font-semibold text-gold-deep">
                  {initials(member.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{member.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {member.designation ?? ROLE_LABELS[member.role] ?? member.role}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 shrink-0"
                      aria-label={`Edit ${member.name}`}
                      onClick={() => setEditing(member)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium capitalize">
                      <ShieldCheck className="size-3" /> {ROLE_LABELS[member.role] ?? member.role}
                    </span>
                    {!member.isActive ? (
                      <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                        Inactive
                      </span>
                    ) : null}
                    {member.isSelf ? (
                      <span className="rounded-full bg-gold-soft px-2 py-0.5 text-[10px] font-medium text-gold-deep">
                        You
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <p className="mt-3 flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
                <Mail className="size-3 shrink-0" /> {member.email}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {branch?.name ?? "No branch"} · joined {member.joinedAt ? formatDate(member.joinedAt) : formatDate(new Date())}
              </p>

              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Sales</span>
                  <span className="tabular font-medium">
                    {compactPaise(member.salesPaise)}
                    {member.salesTargetPaise > 0 ? (
                      <span className="text-muted-foreground"> / {compactPaise(member.salesTargetPaise)}</span>
                    ) : null}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gold"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">
                    Commission {bpToPercent(member.commissionBp)}
                  </span>
                  <span className="tabular font-medium text-gold-deep">{paise(commission)}</span>
                </div>
              </div>
            </Card>
          );
        })}
        {!staff.length ? (
          <Card className="col-span-full p-10 text-center">
            <p className="text-sm font-medium">No staff yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add a team member to assign a role, branch and target.
            </p>
          </Card>
        ) : null}
      </div>

      {editing ? (
        <EditStaffDialog
          key={editing.userId}
          member={editing}
          branches={branches}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      ) : null}

      {adding ? (
        <AddStaffDialog
          branches={branches}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}

function EditStaffDialog({
  member,
  branches,
  onClose,
  onSaved,
}: {
  member: Staff;
  branches: { id: number; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState(member.role);
  const [branchId, setBranchId] = useState(member.branchId ? String(member.branchId) : "none");
  const [designation, setDesignation] = useState(member.designation ?? "");
  const [phone, setPhone] = useState(member.phone ?? "");
  const [commission, setCommission] = useState(bpToPercent(member.commissionBp).replace("%", ""));
  const [target, setTarget] = useState(String(member.salesTargetPaise / 100));
  const [active, setActive] = useState(member.isActive);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const response = await fetch(`/api/staff/${member.userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role,
        branchId: branchId === "none" ? null : Number(branchId),
        designation: designation || undefined,
        phone: phone || undefined,
        commissionBp: percentToBp(commission),
        salesTargetPaise: Math.round(Number(target || 0) * 100),
        isActive: active,
      }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "We could not update this member.");
      setSaving(false);
      return;
    }
    toast.success(`${member.name} updated`);
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Edit {member.name}</DialogTitle>
            <DialogDescription>Role, branch, target and commission for this login.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Branch</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No branch</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="st-designation">Designation</Label>
              <Input
                id="st-designation"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="Senior sales executive"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="st-phone">Phone</Label>
              <Input
                id="st-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                maxLength={15}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="st-commission">Commission (%)</Label>
              <Input
                id="st-commission"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="st-target">Monthly target (₹)</Label>
              <Input
                id="st-target"
                type="number"
                min="0"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-xs sm:col-span-2">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="size-4 rounded border-border"
              />
              Active login
            </label>
          </div>
          {error ? (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddStaffDialog({
  branches,
  onClose,
  onSaved,
}: {
  branches: { id: number; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "salesman",
    designation: "",
    branchId: branches[0] ? String(branches[0].id) : "none",
    commission: "1",
    target: "500000",
  });

  function set(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const response = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
        role: form.role,
        designation: form.designation || undefined,
        branchId: form.branchId === "none" ? null : Number(form.branchId),
        commissionBp: percentToBp(form.commission),
        salesTargetPaise: Math.round(Number(form.target || 0) * 100),
      }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "We could not create this staff member.");
      setSaving(false);
      return;
    }
    toast.success(`${form.name} can now sign in`);
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-4 text-gold-deep" /> Add staff member
            </DialogTitle>
            <DialogDescription>
              Creates a login. Share the temporary password securely and ask them to change it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="as-name">Full name</Label>
              <Input id="as-name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="as-email">Email</Label>
              <Input
                id="as-email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="as-password">Temporary password</Label>
              <Input
                id="as-password"
                type="text"
                minLength={8}
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="At least 8 characters"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => set("role", v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Branch</Label>
              <Select value={form.branchId} onValueChange={(v) => set("branchId", v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No branch</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="as-designation">Designation</Label>
              <Input
                id="as-designation"
                value={form.designation}
                onChange={(e) => set("designation", e.target.value)}
                placeholder="Sales executive"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="as-phone">Phone</Label>
              <Input
                id="as-phone"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value.replace(/\D/g, ""))}
                maxLength={15}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="as-commission">Commission (%)</Label>
              <Input
                id="as-commission"
                type="number"
                step="0.1"
                min="0"
                value={form.commission}
                onChange={(e) => set("commission", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="as-target">Monthly target (₹)</Label>
              <Input
                id="as-target"
                type="number"
                min="0"
                value={form.target}
                onChange={(e) => set("target", e.target.value)}
              />
            </div>
          </div>
          {error ? (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
              Create login
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
