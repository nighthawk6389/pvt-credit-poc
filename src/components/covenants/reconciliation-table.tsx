"use client";

import * as React from "react";
import { ChevronRight, Scale } from "lucide-react";
import { toast } from "sonner";

import { cn, fmtDate } from "@/lib/utils";
import { useRole } from "@/lib/auth/context";
import { can } from "@/lib/auth/roles";
import { fmtCov } from "@/components/covenants/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CovenantChip } from "@/components/deal/badges";
import { FIELD_LIBRARY } from "@/lib/covenants";
import { waiveDefTest } from "@/server/actions/covenant-ops";
import type { CovenantPeriodResult, CovenantSuiteItem } from "@/server/queries/covenants";

export function ReconciliationTable({
  dealId,
  item,
}: {
  dealId: string;
  item: CovenantSuiteItem;
}) {
  const { role } = useRole();
  const canEdit = can(role, "edit", "covenant");
  const [open, setOpen] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  const rows = item.history.filter((h) => h.status !== "Upcoming");

  function waive(testId: string) {
    start(async () => {
      try {
        await waiveDefTest(dealId, testId);
        toast.success("Test waived");
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div>
          <div className="text-sm font-semibold">{item.name}</div>
          <div className="text-muted-foreground font-mono text-[11px]">
            {item.formula} {item.operator} {item.unit === "x" ? "x" : item.unit}
          </div>
        </div>
        <Badge variant="muted" className="text-[10px]">{item.category}</Badge>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground border-b text-xs">
            <th className="px-3 py-2 text-left font-medium">Period</th>
            <th className="px-3 py-2 text-right font-medium">Recomputed</th>
            <th className="px-3 py-2 text-right font-medium">Reported</th>
            <th className="px-3 py-2 text-right font-medium">Δ</th>
            <th className="px-3 py-2 text-right font-medium">Threshold</th>
            <th className="px-3 py-2 text-right font-medium">Headroom</th>
            <th className="px-3 py-2 text-left font-medium">Status</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isOpen = open === r.testId;
            return (
              <React.Fragment key={r.testId}>
                <tr
                  className={cn(
                    "border-b border-border/40 cursor-pointer hover:bg-muted/40",
                    r.reconFlag && "bg-[color-mix(in_oklch,var(--warning)_7%,transparent)]",
                  )}
                  onClick={() => setOpen(isOpen ? null : r.testId)}
                >
                  <td className="px-3 py-2 font-medium">
                    <span className="inline-flex items-center gap-1">
                      <ChevronRight className={cn("size-3.5 transition-transform", isOpen && "rotate-90")} />
                      {fmtDate(r.periodEnd).replace(/, \d{4}/, (m) => m)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">{fmtCov(r.recomputed, item.unit)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmtCov(r.reported, item.unit)}</td>
                  <td className={cn("px-3 py-2 text-right tabular-nums", r.reconFlag && "text-[var(--warning)] font-medium")}>
                    {r.reconDelta != null ? `${r.reconDelta > 0 ? "+" : ""}${r.reconDelta.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmtCov(r.thresholdApplied, item.unit)}</td>
                  <td className={cn("px-3 py-2 text-right tabular-nums", r.headroomPct < 0 ? "text-[var(--danger)]" : r.headroomPct < 10 ? "text-[var(--warning)]" : "")}>
                    {r.springingActive ? `${r.headroomPct.toFixed(1)}%` : "—"}
                  </td>
                  <td className="px-3 py-2"><CovenantChip status={r.status} /></td>
                  <td className="px-3 py-2 text-right">
                    {canEdit && r.status === "Breach" && (
                      <Button variant="outline" size="sm" disabled={pending} onClick={(e) => { e.stopPropagation(); waive(r.testId); }}>
                        Waive
                      </Button>
                    )}
                  </td>
                </tr>
                {isOpen && (
                  <tr className="bg-muted/30">
                    <td colSpan={8} className="px-4 py-3">
                      <ShowMath r={r} formula={item.formula} unit={item.unit} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
          {rows.length === 0 && (
            <tr><td colSpan={8} className="px-3 py-4 text-center text-muted-foreground">No tested periods yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ShowMath({ r, formula, unit }: { r: CovenantPeriodResult; formula: string; unit: string }) {
  const entries = Object.entries(r.inputs);
  return (
    <div className="space-y-2">
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
        <Scale className="size-3.5" /> Recomputation — every input traced to a fundamental field
      </div>
      <div className="flex flex-wrap gap-2">
        {entries.map(([code, val]) => (
          <div key={code} className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs">
            <span className="text-muted-foreground" title={FIELD_LIBRARY[code]?.label}>{code}</span>{" "}
            <span className="font-medium tabular-nums">{val.toFixed(1)}</span>
          </div>
        ))}
      </div>
      <div className="rounded-md bg-background px-3 py-2 font-mono text-xs">
        <span className="text-muted-foreground">{formula}</span>
        {" = "}
        <span className="font-semibold">{fmtCov(r.recomputed, unit)}</span>
        <span className="text-muted-foreground"> (engine, independent)</span>
      </div>
      {r.reported != null && (
        <div className="text-xs text-muted-foreground">
          Borrower-reported: <span className="font-medium text-foreground">{fmtCov(r.reported, unit)}</span>
          {r.reconDelta != null && Math.abs(r.reconDelta) > 0.0001 && (
            <>
              {" · "}discrepancy{" "}
              <span className={r.reconFlag ? "text-[var(--warning)] font-medium" : ""}>
                {r.reconDelta > 0 ? "+" : ""}{r.reconDelta.toFixed(2)} ({r.reconDeltaPct}%)
              </span>
              {r.reconFlag && " — exceeds tolerance, investigate"}
            </>
          )}
        </div>
      )}
    </div>
  );
}
