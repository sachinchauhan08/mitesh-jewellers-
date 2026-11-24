import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: string;
  value: string;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: "default" | "gold" | "positive" | "warning";
  className?: string;
}) {
  return (
    <Card className={cn("relative overflow-hidden p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
        {Icon ? (
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-full",
              tone === "gold"
                ? "bg-gold-soft text-gold-deep"
                : tone === "positive"
                  ? "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"
                  : tone === "warning"
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    : "bg-muted text-muted-foreground",
            )}
          >
            <Icon className="size-4" />
          </span>
        ) : null}
      </div>
      <p className="mt-3 tabular text-2xl font-semibold tracking-tight md:text-[26px]">
        {value}
      </p>
      {hint ? <div className="mt-1.5 text-xs text-muted-foreground">{hint}</div> : null}
    </Card>
  );
}

export function MiniStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="tabular text-lg font-medium">{value}</p>
      {sub ? <p className="text-[11px] text-muted-foreground">{sub}</p> : null}
    </div>
  );
}
