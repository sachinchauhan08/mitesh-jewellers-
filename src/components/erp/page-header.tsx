import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="space-y-1.5">
        {eyebrow ? (
          <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-gold-deep">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-3xl leading-tight md:text-4xl">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

const TONES: Record<string, string> = {
  paid: "border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
  partial: "border-amber-600/20 bg-amber-600/10 text-amber-700 dark:text-amber-400",
  unpaid: "border-red-600/20 bg-red-600/10 text-red-700 dark:text-red-400",
  cancelled: "border-zinc-500/20 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
  active: "border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
  draft: "border-zinc-500/20 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
  archived: "border-zinc-500/20 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
  received: "border-sky-600/20 bg-sky-600/10 text-sky-700 dark:text-sky-400",
  in_progress: "border-amber-600/20 bg-amber-600/10 text-amber-700 dark:text-amber-400",
  ready: "border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
  delivered: "border-zinc-500/20 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize",
        TONES[status] ?? "border-border bg-muted text-muted-foreground",
        className,
      )}
    >
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
