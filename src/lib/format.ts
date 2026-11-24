const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrPrecise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const num = new Intl.NumberFormat("en-IN");

export function paise(value: number | null | undefined): string {
  return inr.format((value ?? 0) / 100);
}

export function rupees(value: number | null | undefined): string {
  return inrPrecise.format((value ?? 0) / 100);
}

export function compactPaise(value: number | null | undefined): string {
  const v = (value ?? 0) / 100;
  if (Math.abs(v) >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (Math.abs(v) >= 100000) return `₹${(v / 100000).toFixed(2)} L`;
  if (Math.abs(v) >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${num.format(Math.round(v))}`;
}

export function grams(mg: number | null | undefined, precision = 3): string {
  return `${((mg ?? 0) / 1000).toFixed(precision)} g`;
}

export function weightValue(mg: number | null | undefined, precision = 3): string {
  return ((mg ?? 0) / 1000).toFixed(precision);
}

export function bpToPercent(bp: number | null | undefined): string {
  return `${((bp ?? 0) / 100).toFixed(2)}%`;
}

export function percentToBp(value: number | string): number {
  return Math.round(Number(value || 0) * 100);
}

export function mgToG(value: number | string): number {
  return Math.round(Number(value || 0) * 1000);
}

export function gToMg(value: number | string): number {
  return Math.round(Number(value || 0) * 1000);
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function titleCase(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}`;
}

function threeDigits(n: number): string {
  if (n < 100) return twoDigits(n);
  return `${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${twoDigits(n % 100)}` : ""}`;
}

export function numberToWordsINR(valuePaise: number): string {
  const rupeesValue = Math.floor(Math.abs(valuePaise) / 100);
  const paiseValue = Math.abs(valuePaise) % 100;
  if (rupeesValue === 0 && paiseValue === 0) return "Zero Rupees Only";

  const parts: string[] = [];
  const crore = Math.floor(rupeesValue / 10000000);
  const lakh = Math.floor((rupeesValue % 10000000) / 100000);
  const thousand = Math.floor((rupeesValue % 100000) / 1000);
  const hundred = rupeesValue % 1000;

  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));

  const rupeesWords = parts.join(" ").trim();
  const paiseWords = paiseValue ? ` and ${twoDigits(paiseValue)} Paise` : "";
  return `${rupeesWords} Rupees${paiseWords} Only`;
}
