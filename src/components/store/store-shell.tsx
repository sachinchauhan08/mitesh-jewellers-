"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, ShoppingBag, X } from "lucide-react";
import { paise } from "@/lib/format";
import { CartProvider, useCart } from "@/components/store/cart-provider";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/shop?metal=gold", label: "Gold" },
  { href: "/shop?metal=silver", label: "Silver" },
  { href: "/about", label: "Our story" },
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
      <div className="flex min-h-screen flex-col">
        <div className="bg-primary text-primary-foreground">
          <div className="mx-auto flex max-w-6xl items-center gap-4 overflow-x-auto px-4 py-1.5 text-[11px] no-scrollbar">
            <span className="shrink-0 font-medium tracking-[0.14em] uppercase opacity-70">
              Today&apos;s rates
            </span>
            {rates.map((rate) => (
              <span key={rate.label} className="shrink-0 tabular">
                <span className="opacity-70">{rate.label}</span>{" "}
                <span className="font-medium">{rate.value}</span>
              </span>
            ))}
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
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-full border border-gold/50 bg-gold-soft text-sm font-semibold text-gold-deep">
            A
          </span>
          <span className="font-display text-xl leading-none tracking-wide">Aura Jewels</span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex" aria-label="Store">
          {NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`text-xs font-medium tracking-wide transition-colors hover:text-gold-deep ${
                pathname === item.href ? "text-gold-deep" : "text-muted-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm" className="hidden h-9 text-xs sm:inline-flex">
            <Link href="/auth/sign-in">Staff login</Link>
          </Button>
          <Link
            href="/cart"
            className="relative inline-flex size-10 items-center justify-center rounded-full hover:bg-muted"
            aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
          >
            <ShoppingBag className="size-5" />
            {count > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-gold text-[10px] font-semibold text-white">
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
    <footer className="mt-16 border-t border-border bg-secondary/50">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-lg">Aura Jewels</p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            BIS-hallmarked gold, natural diamonds and hand-finished bridal jewellery, made in
            Mumbai since 1978.
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Shop
          </p>
          <ul className="mt-3 space-y-2 text-xs">
            <li><Link href="/shop" className="hover:text-gold-deep">All jewellery</Link></li>
            <li><Link href="/shop?metal=gold" className="hover:text-gold-deep">Gold</Link></li>
            <li><Link href="/shop?metal=silver" className="hover:text-gold-deep">Silver</Link></li>
            <li><Link href="/shop?metal=platinum" className="hover:text-gold-deep">Platinum</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Help
          </p>
          <ul className="mt-3 space-y-2 text-xs">
            <li><Link href="/about" className="hover:text-gold-deep">Our story</Link></li>
            <li><Link href="/contact" className="hover:text-gold-deep">Showrooms</Link></li>
            <li><Link href="/contact" className="hover:text-gold-deep">Hallmark &amp; buyback</Link></li>
            <li><Link href="/auth/sign-in" className="hover:text-gold-deep">Staff login</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Your bag
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            {count > 0
              ? `${count} item${count === 1 ? "" : "s"} · ${paise(totalPaise)}`
              : "Your bag is empty."}
          </p>
          <Link href="/cart" className="mt-2 inline-block text-xs font-medium text-gold-deep hover:underline">
            Review bag →
          </Link>
        </div>
      </div>
      <div className="border-t border-border/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Aura Jewels Pvt. Ltd. All prices inclusive of GST.</p>
          <p>GSTIN 27AABCA1234M1Z5 · BIS Hallmark certified</p>
        </div>
      </div>
    </footer>
  );
}
