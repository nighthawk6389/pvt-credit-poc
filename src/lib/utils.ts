import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as USD millions, e.g. 185 -> "$185.0MM". */
export function fmtMM(value: number | null | undefined, dp = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `$${value.toFixed(dp)}MM`;
}

/** Format a plain USD amount with thousands separators. */
export function fmtUSD(value: number | null | undefined, dp = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  }).format(value);
}

/** Format basis points as a spread, e.g. 575 -> "S+575". */
export function fmtSpread(bps: number | null | undefined): string {
  if (bps === null || bps === undefined) return "—";
  return `S+${bps}`;
}

/** Format a leverage / coverage multiple, e.g. 4.4 -> "4.4x". */
export function fmtX(value: number | null | undefined, dp = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(dp)}x`;
}

/** Format a percentage, e.g. 0.125 with asRatio -> "12.5%", or 12.5 -> "12.5%". */
export function fmtPct(
  value: number | null | undefined,
  { dp = 1, asRatio = false }: { dp?: number; asRatio?: boolean } = {},
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const v = asRatio ? value * 100 : value;
  return `${v.toFixed(dp)}%`;
}

/** Format an ISO date string as "MMM d, yyyy". */
export function fmtDate(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Short month-year, e.g. "Q2 '25" style not needed — "Mar '25". */
export function fmtMonthYear(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}
