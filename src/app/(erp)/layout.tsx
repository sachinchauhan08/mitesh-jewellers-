import { requireSession } from "@/lib/auth-helpers";
import { getLatestRates } from "@/lib/rates";
import { AppShell } from "@/components/erp/app-shell";

export default async function ErpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const rates = await getLatestRates();

  return (
    <AppShell
      user={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        designation: session.user.designation,
      }}
      rates={rates.map((rate) => ({
        metal: rate.metal,
        purity: rate.purity,
        ratePerGramPaise: rate.ratePerGramPaise,
      }))}
    >
      {children}
    </AppShell>
  );
}
