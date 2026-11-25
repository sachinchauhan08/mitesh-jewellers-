"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Clock, MapPin, Menu, Phone, ShoppingBag, X } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { paise } from "@/lib/format";
import { CartProvider, useCart } from "@/components/store/cart-provider";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/shop", label: "All jewellery" },
  { href: "/shop?metal=gold", label: "Gold" },
  { href: "/shop?metal=silver", label: "Silver" },
  { href: "/shop?category=bridal-jewellery", label: "Bridal" },
  { href: "/about", label: "The house" },
  { href: "/contact", label: "Visit us" },
];

export function StoreShell({
  rates,
  children,
}: {
  rates: { label: string; value: string }[];
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <div className="bg-primary text-primary-foreground">
          <div className="mx-auto flex max-w-6xl items-center gap-5 overflow-x-auto px-4 py-2 text-[11px] no-scrollbar">
            <span className="shrink-0 uppercase tracking-[0.24em] text-primary-foreground/55">
              Rate card
            </span>
            {rates.map((rate) => (
              <span key={rate.label} className="shrink-0 tabular">
                <span className="text-primary-foreground/60">{rate.label}</span>{" "}
                <span className="font-medium">{rate.value}</span>
              </span>
            ))}
            <span className="ml-auto hidden shrink-0 items-center gap-1.5 text-primary-foreground/60 sm:flex">
              <Phone className="size-3" />
              <a href={BRAND.phoneHref} className="hover:text-primary-foreground">
                {BRAND.phone}
              </a>
            </span>
          </div>
        </div>
        <StoreHeader />
        <main className="flex-1">{children}</main>
        <StoreFooter />
      </div>
    </CartProvider>
  );
}

function StoreHeader() {
  const pathname = usePathname();
  const { count } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="group flex items-center gap-3">
          <span className="relative flex size-10 items-center justify-center rounded-full border border-gold/50 bg-gradient-to-br from-gold-soft to-card">
            <span className="font-display text-lg leading-none text-gold-deep">M</span>
          </span>
          <span className="leading-none">
            <span className="block font-display text-[22px] tracking-[0.02em]">
              {BRAND.name}
            </span>
            <span className="mt-1 block text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
              {BRAND.tagline}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Store">
          {NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`relative text-[12px] font-medium tracking-wide transition-colors hover:text-gold-deep ${
                pathname === item.href ? "text-gold-deep" : "text-muted-foreground"
              }`}
            >
              {item.label}
              {pathname === item.href ? (
                <span className="absolute -bottom-2 left-0 h-px w-full bg-gold" />
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm" className="hidden h-9 text-[11px] tracking-wide sm:inline-flex">
            <Link href="/auth/sign-in">Staff login</Link>
          </Button>
          <Link
            href="/cart"
            className="relative inline-flex size-10 items-center justify-center rounded-full border border-transparent transition-colors hover:border-border hover:bg-card"
            aria-label={`Bag, ${count} item${count === 1 ? "" : "s"}`}
          >
            <ShoppingBag className="size-[18px]" />
            {count > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex size-[18px] items-center justify-center rounded-full bg-gold text-[10px] font-semibold text-white">
                {count}
              </span>
            ) : null}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="size-10 lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {open ? (
        <nav className="border-t border-border bg-background px-4 py-2 lg:hidden" aria-label="Mobile">
          {NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex h-11 items-center text-sm text-muted-foreground hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/auth/sign-in"
            onClick={() => setOpen(false)}
            className="flex h-11 items-center text-sm text-muted-foreground hover:text-foreground"
          >
            Staff login
          </Link>
        </nav>
      ) : null}
    </header>
  );
}

function StoreFooter() {
  const { totalPaise, count } = useCart();
  return (
    <footer className="mt-20 border-t border-border bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-2xl tracking-wide">{BRAND.name}</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.26em] text-primary-foreground/50">
            {BRAND.tagline} · {BRAND.city}, {BRAND.state}
          </p>
          <p className="mt-4 text-xs leading-relaxed text-primary-foreground/60">
            Hallmarked gold and silver jewellery, priced from the day&apos;s authorised rate with
            making charges shown in full.
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-primary-foreground/45">
            Explore
          </p>
          <ul className="mt-4 space-y-2.5 text-xs text-primary-foreground/70">
            <li><Link href="/shop" className="hover:text-primary-foreground">All jewellery</Link></li>
            <li><Link href="/shop?metal=gold" className="hover:text-primary-foreground">Gold</Link></li>
            <li><Link href="/shop?metal=silver" className="hover:text-primary-foreground">Silver</Link></li>
            <li><Link href="/shop?category=bridal-jewellery" className="hover:text-primary-foreground">Bridal</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-primary-foreground/45">
            Visit the store
          </p>
          <ul className="mt-4 space-y-3 text-xs text-primary-foreground/70">
            <li className="flex gap-2">
              <MapPin className="mt-0.5 size-3.5 shrink-0 text-gold" />
              <a href={BRAND.mapsHref} target="_blank" rel="noreferrer" className="hover:text-primary-foreground">
                {BRAND.address}
              </a>
            </li>
            <li className="flex gap-2">
              <Clock className="mt-0.5 size-3.5 shrink-0 text-gold" />
              <span>
                {BRAND.hours[0].days}: {BRAND.hours[0].time}
                <br />
                {BRAND.hours[1].days}: {BRAND.hours[1].time}
              </span>
            </li>
            <li className="flex gap-2">
              <Phone className="mt-0.5 size-3.5 shrink-0 text-gold" />
              <a href={BRAND.phoneHref} className="hover:text-primary-foreground">{BRAND.phone}</a>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-primary-foreground/45">
            Your bag
          </p>
          <p className="mt-4 text-xs text-primary-foreground/70">
            {count > 0
              ? `${count} item${count === 1 ? "" : "s"} · ${paise(totalPaise)}`
              : "Your bag is empty."}
          </p>
          <Link href="/cart" className="mt-2 inline-block text-xs font-medium text-gold hover:underline">
            Review bag →
          </Link>
          <div className="mt-5 flex flex-wrap gap-1.5">
            {BRAND.profiles.map((profile) => (
              <a
                key={profile.label}
                href={profile.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-primary-foreground/20 px-2.5 py-1 text-[10px] text-primary-foreground/70 transition-colors hover:border-gold/60 hover:text-primary-foreground"
              >
                {profile.label}
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-primary-foreground/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 text-[10px] text-primary-foreground/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {BRAND.name}. All prices inclusive of GST.</p>
          <p>GSTIN {BRAND.gstin} · {BRAND.payments.join(" · ")}</p>
        </div>
      </div>
    </footer>
  );
}
