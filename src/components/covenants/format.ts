/** Format a covenant value by its unit. */
export function fmtCov(value: number | null | undefined, unit: string, dp = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (unit === "x") return `${value.toFixed(dp)}x`;
  if (unit === "%") return `${value.toFixed(1)}%`;
  if (unit === "$MM") return `$${value.toFixed(1)}MM`;
  return value.toFixed(dp);
}

export function categoryTone(category: string): string {
  switch (category) {
    case "Maintenance":
      return "info";
    case "Springing":
      return "warning";
    case "Incurrence":
      return "muted";
    case "Reporting":
      return "secondary";
    default:
      return "muted";
  }
}
