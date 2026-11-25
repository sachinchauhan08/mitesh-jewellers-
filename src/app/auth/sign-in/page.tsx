"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEMOS = [
  { label: "Administrator", email: "admin@miteshjewellers.in" },
  { label: "Store Manager", email: "manager@miteshjewellers.in" },
  { label: "Cashier", email: "cashier@miteshjewellers.in" },
];

function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirectTo") || "/dashboard";
  const [email, setEmail] = useState("admin@miteshjewellers.in");
  const [password, setPassword] = useState("Admin@12345");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const { error: authError } = await authClient.signIn.email({
      email,
      password,
    });
    if (authError) {
      setError(
        authError.message ||
          "We could not sign you in. Check your email and password and try again.",
      );
      setLoading(false);
      return;
    }
    toast.success("Welcome back to Mitesh Jewellers");
    router.replace(redirectTo);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-gold-deep">
          Staff access
        </p>
        <h1 className="font-display text-4xl leading-tight">Sign in to the ERP</h1>
        <p className="text-sm text-muted-foreground">
          Use your showroom credentials to open the billing desk.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="h-11 w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" /> Signing in…
            </>
          ) : (
            <>
              Sign in <ArrowRight className="ml-2 size-4" />
            </>
          )}
        </Button>
      </form>

      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Demo accounts · password Admin@12345
        </p>
        <div className="flex flex-wrap gap-2">
          {DEMOS.map((demo) => (
            <button
              key={demo.email}
              type="button"
              onClick={() => {
                setEmail(demo.email);
                setPassword("Admin@12345");
              }}
              className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-gold hover:text-foreground"
            >
              {demo.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        New to the team?{" "}
        <Link href="/auth/sign-up" className="text-foreground underline underline-offset-4">
          Create a staff account
        </Link>
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
      <SignInForm />
    </Suspense>
  );
}
