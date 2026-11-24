import { desc, eq } from "drizzle-orm";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { db } from "@/lib/db";
import { metalRates } from "@/lib/db/schema";
import { getLatestRates } from "@/lib/rates";
import { formatDateTime, paise } from "@/lib/format";
import { PageHeader, SectionHeading } from "@/components/erp/page-header";
import { UpdateRateDialog, RateHistoryTable } from "@/components/erp/rates-manager";
import { RateSparkline } from "@/components/erp/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Metal rates" };

const GROUPS = [
  { metal: "gold" as const, label: "Gold", purities: ["24K", "22K", "20K", "18K"] },
  { metal: "silver" as const, label: "Silver", purities: ["999"] },
  { metal: "platinum" as const, label: "Platinum", purities: ["950"] },
];

export default async function RatesPage() {
  const latest = await getLatestRates();
  const history = await db
    .select()
    .from(metalRates)
    .orderBy(desc(metalRates.effectiveFrom), desc(metalRates.id))
    .limit(60);

  const gold22History = history
    .filter((r) => r.metal === "gold" && r.purity === "22K")
    .slice(0, 31)
    .reverse()
    .map((r) => ({ date: r.effectiveFrom.toISOString(), rate: r.ratePerGramPaise }));

  const previous = (metal: string, purity: string, current: number) => {
    const rows = history.filter((r) => r.metal === metal && r.purity === purity);
    return rows.find((r) => r.ratePerGramPaise !== current)?.ratePerGramPaise ?? current;
  };

  return (
    <div>
      <PageHeader
        eyebrow="Rate card"
        title="Live metal rates"
        description="Authorised rates per gram. Billing, old gold valuation and the storefront always read the latest published rate."
        actions={<UpdateRateDialog />}
      />

      <div className="space-y-6">
        {GROUPS.map((group) => (
          <div key={group.metal}>
            <SectionHeading title={`${group.label} rates`} />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {group.purities.map((purity) => {
                const rate = latest.find((r) => r.metal === group.metal && r.purity === purity);
                const prev = rate ? previous(group.metal, purity, rate.ratePerGramPaise) : 0;
                const delta = rate ? rate.ratePerGramPaise - prev : 0;
                return (
                  <Card
                    key={`${group.metal}-${purity}`}
                    className={group.metal === "gold" ? "border-gold/30 bg-gold-soft/40" : ""}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          {purity} {group.label}
                        </p>
                        <Badge variant="outline" className="rounded-full border-gold/40 text-[10px] text-gold-deep">
                          Live
                        </Badge>
                      </div>
                      <p className="mt-2 tabular text-2xl font-semibold">
                        {paise(rate?.ratePerGramPaise)}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">/g</span>
                      </p>
                      <div className="mt-2 flex items-center gap-1.5 text-[11px]">
                        {delta === 0 ? (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Minus className="size-3" /> Unchanged
                          </span>
                        ) : (
                          <span
                            className={`flex items-center gap-1 ${delta > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                          >
                            {delta > 0 ? (
                              <ArrowUpRight className="size-3" />
                            ) : (
                              <ArrowDownRight className="size-3" />
                            )}
                            {paise(Math.abs(delta))} ({((delta / (prev || 1)) * 100).toFixed(2)}%)
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-[10px] text-muted-foreground">
                        {formatDateTime(rate?.effectiveFrom)}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">22K gold · 30 days</CardTitle>
            <p className="text-xs text-muted-foreground">Published rate movement</p>
          </CardHeader>
          <CardContent>
            <RateSparkline data={gold22History} />
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">30-day low</span>
                <span className="tabular font-medium">
                  {paise(Math.min(...gold22History.map((r) => r.rate)))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">30-day high</span>
                <span className="tabular font-medium">
                  {paise(Math.max(...gold22History.map((r) => r.rate)))}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="xl:col-span-2">
          <RateHistoryTable rows={history.slice(0, 14)} />
        </div>
      </div>
    </div>
  );
}
