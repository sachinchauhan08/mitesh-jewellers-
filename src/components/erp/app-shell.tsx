"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Bell,
  ChevronsUpDown,
  Coins,
  Gem,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  ReceiptText,
  ScanBarcode,
  Search,
  Settings,
  ShoppingCart,
  Store,
  TrendingUp,
  Truck,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { initials, paise } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type ShellUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  designation?: string | null;
};

type Rate = {
  metal: string;
  purity: string;
  ratePerGramPaise: number;
};

const RANK: Record<string, number> = {
  admin: 5,
  manager: 4,
  accountant: 3,
  cashier: 2,
  salesman: 1,
};

const NAV = [
  {
    group: "Counter",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/pos", label: "New sale", icon: ScanBarcode, minRole: "cashier" },
      { href: "/invoices", label: "Invoices", icon: ReceiptText },
      { href: "/old-gold", label: "Old gold", icon: Coins, minRole: "cashier" },
      { href: "/repairs", label: "Repairs", icon: Wrench },
    ],
  },
  {
    group: "Catalogue",
    items: [
      { href: "/inventory", label: "Inventory", icon: Gem, minRole: "manager" },
      { href: "/rates", label: "Metal rates", icon: TrendingUp, minRole: "manager" },
      { href: "/purchases", label: "Purchases", icon: ShoppingCart, minRole: "accountant" },
    ],
  },
  {
    group: "Relationships",
    items: [
      { href: "/customers", label: "Customers", icon: Users },
      { href: "/suppliers", label: "Suppliers", icon: Truck, minRole: "manager" },
      { href: "/staff", label: "Staff", icon: UserCog, minRole: "manager" },
    ],
  },
  {
    group: "Insights",
    items: [
      { href: "/reports", label: "Reports", icon: BarChart3, minRole: "accountant" },
      { href: "/settings", label: "Settings", icon: Settings, minRole: "admin" },
    ],
  },
];

function NavList({
  role,
  onNavigate,
}: {
  role: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav className="space-y-7">
      {NAV.map((group) => {
        const items = group.items.filter(
          (item) => !item.minRole || (RANK[role] ?? 0) >= (RANK[item.minRole] ?? 99),
        );
        if (!items.length) return null;
        return (
          <div key={group.group} className="space-y-1.5">
            <p className="px-3 text-[10px] font-medium uppercase tracking-[0.24em] text-sidebar-foreground/35">
              {group.group}
            </p>
            {items.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                  )}
                >
                  <item.icon
                    className={cn(
                      "size-4 shrink-0",
                      active ? "text-sidebar-primary" : "text-sidebar-foreground/45",
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                  {active ? (
                    <span className="ml-auto size-1.5 rounded-full bg-sidebar-primary" />
                  ) : null}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-3 px-3">
      <span className="flex size-9 items-center justify-center rounded-full border border-sidebar-primary/40 bg-sidebar-accent">
        <Gem className="size-4 text-sidebar-primary" />
      </span>
      <span className="leading-tight">
        <span className="block font-display text-xl tracking-wide text-sidebar-foreground">
          Aura Jewels
        </span>
        <span className="block text-[10px] uppercase tracking-[0.28em] text-sidebar-foreground/40">
          Jewellery ERP
        </span>
      </span>
    </Link>
  );
}

function AccountMenu({ user }: { user: ShellUser }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    setBusy(true);
    await authClient.signOut();
    router.replace("/auth/sign-in");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center gap-3 rounded-lg border border-sidebar-border bg-sidebar-accent/40 px-3 py-2.5 text-left transition-colors hover:bg-sidebar-accent">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/15 text-xs font-semibold text-sidebar-primary">
            {initials(user.name)}
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm text-sidebar-foreground">
              {user.name}
            </span>
            <span className="block truncate text-[11px] text-sidebar-foreground/45">
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
          </span>
          <ChevronsUpDown className="size-4 text-sidebar-foreground/40" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="mr-2 size-4" /> Account settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/">
            <Store className="mr-2 size-4" /> Open storefront
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={busy}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 size-4" /> {busy ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({
  user,
  rates,
  children,
}: {
  user: ShellUser;
  rates: Rate[];
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const [search, setSearch] = useState("");

  const gold22 = rates.find((r) => r.metal === "gold" && r.purity === "22K");
  const silver = rates.find((r) => r.metal === "silver");
  const platinum = rates.find((r) => r.metal === "platinum");

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    if (!search.trim()) return;
    router.push(`/inventory?q=${encodeURIComponent(search.trim())}`);
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-20 items-center">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <NavList role={user.role} />
        </div>
        <div className="space-y-3 border-t border-sidebar-border p-3">
          <div className="rounded-lg border border-sidebar-border px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/35">
              Today&apos;s rate
            </p>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xs text-sidebar-foreground/60">Gold 22K</span>
              <span className="tabular text-sm text-sidebar-primary">
                {paise(gold22?.ratePerGramPaise)}/g
              </span>
            </div>
          </div>
          <AccountMenu user={user} />
        </div>
      </aside>

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 md:px-8">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] bg-sidebar p-0 text-sidebar-foreground">
                <SheetHeader className="h-20 justify-center border-b border-sidebar-border px-3">
                  <SheetTitle className="sr-only">Main navigation</SheetTitle>
                  <Brand />
                </SheetHeader>
                <div className="overflow-y-auto px-3 py-4">
                  <NavList role={user.role} onNavigate={() => setMobileOpen(false)} />
                </div>
                <div className="mt-auto p-3">
                  <AccountMenu user={user} />
                </div>
              </SheetContent>
            </Sheet>

            <form onSubmit={submitSearch} className="relative hidden max-w-xs flex-1 md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products, SKU, barcode…"
                className="h-9 bg-card pl-9"
                aria-label="Search products"
              />
            </form>

            <div className="ml-auto flex items-center gap-2">
              <div className="hidden items-center gap-4 rounded-full border border-border bg-card px-4 py-1.5 xl:flex">
                {gold22 ? (
                  <span className="flex items-center gap-1.5 text-xs">
                    <span className="size-1.5 rounded-full bg-gold" />
                    <span className="text-muted-foreground">Gold 22K</span>
                    <span className="tabular font-medium">{paise(gold22.ratePerGramPaise)}</span>
                  </span>
                ) : null}
                {silver ? (
                  <span className="flex items-center gap-1.5 text-xs">
                    <span className="size-1.5 rounded-full bg-zinc-400" />
                    <span className="text-muted-foreground">Silver</span>
                    <span className="tabular font-medium">{paise(silver.ratePerGramPaise)}</span>
                  </span>
                ) : null}
                {platinum ? (
                  <span className="flex items-center gap-1.5 text-xs">
                    <span className="size-1.5 rounded-full bg-zinc-600" />
                    <span className="text-muted-foreground">Platinum</span>
                    <span className="tabular font-medium">{paise(platinum.ratePerGramPaise)}</span>
                  </span>
                ) : null}
              </div>
              <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
                <Bell className="size-4" />
                <span className="absolute right-2 top-2 size-1.5 rounded-full bg-gold" />
              </Button>
              <Button asChild size="sm" className="h-9 gap-1.5">
                <Link href="/pos">
                  <Plus className="size-4" /> <span className="hidden sm:inline">New sale</span>
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1500px] px-4 py-6 pb-16 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
