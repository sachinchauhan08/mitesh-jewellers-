import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Gem } from "lucide-react";
import { getSession } from "@/lib/auth-helpers";

export const metadata: Metadata = { title: "Staff sign in" };

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-[#1b1611] lg:block">
        <div
          className="absolute inset-0 opacity-45"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1400&q=80)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#14100c] via-[#14100c]/60 to-transparent" />
        <div className="relative flex h-full flex-col justify-between p-12 text-[#f4ecdf]">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full border border-[#c8a86a]/50">
              <Gem className="size-5 text-[#c8a86a]" />
            </span>
            <span className="text-sm uppercase tracking-[0.35em]">Aura Jewels</span>
          </Link>
          <div className="max-w-md space-y-5">
            <p className="text-xs uppercase tracking-[0.3em] text-[#c8a86a]">
              Jewellery ERP · Est. 1974
            </p>
            <h1 className="font-display text-5xl leading-[1.05]">
              Every gram, every rupee, accounted for.
            </h1>
            <p className="text-sm leading-relaxed text-[#e6d9c6]/75">
              Live metal rates, hallmarked inventory, POS billing, old gold
              exchange and customer ledgers — one workspace for the whole house.
            </p>
          </div>
          <div className="flex items-center gap-6 text-xs text-[#e6d9c6]/60">
            <span>3 showrooms</span>
            <span className="h-3 w-px bg-[#e6d9c6]/20" />
            <span>BIS hallmarked</span>
            <span className="h-3 w-px bg-[#e6d9c6]/20" />
            <span>Since 1974</span>
          </div>
        </div>
      </div>
      <div className="flex min-h-screen flex-col bg-background">
        <div className="flex items-center justify-between p-6 lg:justify-end">
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <Gem className="size-5 text-gold-deep" />
            <span className="text-sm uppercase tracking-[0.25em]">Aura</span>
          </Link>
          <Link
            href="/"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to storefront
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
