import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { branches, settings } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/erp/page-header";
import { SettingsClient } from "@/components/erp/settings-client";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await requireSession();
  if (session.user.role !== "admin") redirect("/dashboard");

  const [rows, branchRows] = await Promise.all([
    db.select().from(settings),
    db.select().from(branches).orderBy(asc(branches.name)),
  ]);

  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));

  return (
    <div>
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Company identity, tax and pricing defaults, showrooms and team access."
      />
      <SettingsClient
        initial={{
          company_name: values.company_name ?? "Mitesh Jewellers",
          company_address: values.company_address ?? "",
          company_gstin: values.company_gstin ?? "",
          company_phone: values.company_phone ?? "",
          company_email: values.company_email ?? "",
          gst_rate_bp: values.gst_rate_bp ?? "300",
          weight_precision: values.weight_precision ?? "3",
          loyalty_rate_bp: values.loyalty_rate_bp ?? "100",
          invoice_footer: values.invoice_footer ?? "",
        }}
        branches={branchRows.map((b) => ({
          id: b.id,
          name: b.name,
          code: b.code,
          city: b.city,
          phone: b.phone,
          gstin: b.gstin,
        }))}
      />
    </div>
  );
}
