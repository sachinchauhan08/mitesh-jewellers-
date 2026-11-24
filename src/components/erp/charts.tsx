"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { compactPaise, paise } from "@/lib/format";

const GOLD = "var(--chart-1)";
const INK = "var(--chart-2)";
const PIE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "#a8a29e"];

function TooltipBox({
  active,
  payload,
  label,
  mode = "currency",
}: {
  active?: boolean;
  payload?: { value?: number | string; name?: string; color?: string }[];
  label?: string;
  mode?: "currency" | "number";
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-popover-foreground">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center gap-2 text-muted-foreground">
          <span
            className="size-1.5 rounded-full"
            style={{ background: entry.color ?? GOLD }}
          />
          {entry.name}:{" "}
          <span className="tabular text-foreground">
            {mode === "currency"
              ? paise(Number(entry.value))
              : Number(entry.value).toLocaleString("en-IN")}
          </span>
        </p>
      ))}
    </div>
  );
}

export function SalesAreaChart({
  data,
}: {
  data: { day: string; sales: number; invoices: number }[];
}) {
  const shaped = data.map((d) => ({
    ...d,
    label: new Date(`${d.day}T00:00:00`).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    }),
  }));
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={shaped} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GOLD} stopOpacity={0.28} />
              <stop offset="100%" stopColor={GOLD} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            interval="preserveStartEnd"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickFormatter={(v) => compactPaise(Number(v))}
            width={62}
          />
          <Tooltip content={<TooltipBox />} />
          <Area
            type="monotone"
            dataKey="sales"
            name="Sales"
            stroke={GOLD}
            strokeWidth={2}
            fill="url(#goldFill)"
            activeDot={{ r: 4, fill: GOLD }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PurchaseBarChart({
  data,
}: {
  data: { month: string; purchases: number }[];
}) {
  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickFormatter={(v) => compactPaise(Number(v))}
            width={58}
          />
          <Tooltip content={<TooltipBox />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
          <Bar dataKey="purchases" name="Purchases" fill={INK} radius={[4, 4, 0, 0]} maxBarSize={38} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MixDonut({
  data,
  totalLabel,
}: {
  data: { name: string; value: number }[];
  totalLabel?: string;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-[170px] w-[170px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={52}
              outerRadius={76}
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<TooltipBox />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {totalLabel ?? "Total"}
          </span>
          <span className="tabular text-sm font-semibold">{compactPaise(total)}</span>
        </div>
      </div>
      <ul className="w-full space-y-2">
        {data.map((entry, index) => (
          <li key={entry.name} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: PIE_COLORS[index % PIE_COLORS.length] }}
              />
              <span className="truncate capitalize text-muted-foreground">{entry.name}</span>
            </span>
            <span className="tabular font-medium">{compactPaise(entry.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RateSparkline({
  data,
}: {
  data: { date: string; rate: number }[];
}) {
  const shaped = data.map((d) => ({
    rate: d.rate,
    label: new Date(d.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
  }));
  return (
    <div className="h-[130px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={shaped} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="rateFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GOLD} stopOpacity={0.35} />
              <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow">
                  <p className="text-muted-foreground">{label}</p>
                  <p className="tabular font-medium">{paise(Number(payload[0].value))}/g</p>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="rate"
            stroke={GOLD}
            strokeWidth={2}
            fill="url(#rateFill)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
