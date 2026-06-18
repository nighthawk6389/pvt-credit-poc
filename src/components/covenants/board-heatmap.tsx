import Link from "next/link";

import { cn } from "@/lib/utils";
import { covenantVariant } from "@/lib/status";
import { Badge } from "@/components/ui/badge";
import type { BoardRow } from "@/server/queries/covenants";

const CELL_BG: Record<string, string> = {
  Breach: "bg-[color-mix(in_oklch,var(--danger)_22%,transparent)] text-[var(--danger)]",
  Missing: "bg-[color-mix(in_oklch,var(--danger)_22%,transparent)] text-[var(--danger)]",
  Late: "bg-[color-mix(in_oklch,var(--danger)_16%,transparent)] text-[var(--danger)]",
  "Recon-flag": "bg-[color-mix(in_oklch,var(--warning)_20%,transparent)] text-[var(--warning)]",
  "Near-breach": "bg-[color-mix(in_oklch,var(--warning)_20%,transparent)] text-[var(--warning)]",
  Pass: "bg-[color-mix(in_oklch,var(--success)_14%,transparent)] text-[var(--success)]",
  Waived: "bg-muted text-muted-foreground",
  Upcoming: "bg-muted text-muted-foreground",
  "N/A-springing": "bg-muted/50 text-muted-foreground",
};

export function BoardHeatmap({ rows }: { rows: BoardRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/70 bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="px-4 py-2.5 text-left font-medium">Borrower</th>
            <th className="px-3 py-2.5 text-left font-medium">Sector</th>
            <th className="px-3 py-2.5 text-left font-medium">Covenant status</th>
            <th className="px-3 py-2.5 text-right font-medium">Min headroom</th>
            <th className="px-3 py-2.5 text-left font-medium">Worst</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.dealId} className="border-b border-border/40 hover:bg-muted/30">
              <td className="px-4 py-2.5">
                <Link href={`/deals/${r.dealId}/covenants`} className="font-medium hover:text-primary">
                  {r.borrower}
                </Link>
                <div className="text-muted-foreground text-xs">{r.deal}</div>
              </td>
              <td className="px-3 py-2.5 text-muted-foreground">{r.sector}</td>
              <td className="px-3 py-2.5">
                <div className="flex flex-wrap gap-1">
                  {r.covenants.map((c, i) => (
                    <span
                      key={i}
                      title={`${c.name}: ${c.status}${c.headroomPct != null ? ` (${c.headroomPct.toFixed(1)}%)` : ""}`}
                      className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", CELL_BG[c.status] ?? "bg-muted")}
                    >
                      {abbrev(c.name)}
                    </span>
                  ))}
                </div>
              </td>
              <td className={cn("px-3 py-2.5 text-right tabular-nums", r.minHeadroom != null && r.minHeadroom < 10 ? "text-[var(--warning)]" : "")}>
                {r.minHeadroom != null ? `${r.minHeadroom.toFixed(1)}%` : "—"}
              </td>
              <td className="px-3 py-2.5">
                <Badge variant={covenantVariant(r.worstStatus)}>{r.worstStatus}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function abbrev(name: string): string {
  const map: Record<string, string> = {
    "Total Net Leverage": "Lev",
    "Senior Secured Leverage": "Sr Lev",
    "Fixed Charge Coverage": "FCCR",
    "Interest Coverage": "ICR",
    "Springing Interest Coverage": "Spring ICR",
    "Minimum Liquidity": "Liq",
    "Minimum EBITDA": "Min EBITDA",
    "Maximum Capex": "Capex",
    "Incurrence — Debt Basket (Ratio)": "Incur",
  };
  return map[name] ?? name.slice(0, 6);
}
