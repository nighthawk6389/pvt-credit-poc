"use client";

import * as React from "react";
import { Gauge, TrendingDown, Percent } from "lucide-react";

import { cn } from "@/lib/utils";
import { fmtCov } from "@/components/covenants/format";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  evaluate,
  projectCovenant,
  type ParsedDefinition,
  type FactMap,
} from "@/lib/covenants";

type Period = { periodEnd: string; periodLabel: string; facts: FactMap };

export function ScenarioSlider({
  definitions,
  periods,
}: {
  definitions: ParsedDefinition[];
  periods: Period[];
}) {
  const [haircut, setHaircut] = React.useState(0);
  const [rateShock, setRateShock] = React.useState(0);
  const scenario = { ebitdaHaircutPct: haircut, rateShockBps: rateShock };

  const latest = periods[periods.length - 1];

  const projections = definitions.map((def) => ({
    def,
    points: projectCovenant(def, periods, scenario),
    base: latest ? evaluate(def, latest.facts, new Date(latest.periodEnd)) : null,
  }));

  const tripCount = projections.filter((p) => p.points.some((pt) => pt.trips)).length;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="grid grid-cols-1 gap-6 rounded-xl border border-border/70 bg-card p-4 sm:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 font-medium">
              <TrendingDown className="size-4" /> EBITDA haircut
            </span>
            <Badge variant={haircut > 0 ? "warning" : "muted"} className="tabular-nums">−{haircut}%</Badge>
          </div>
          <Slider value={[haircut]} min={0} max={40} step={1} onValueChange={(v) => setHaircut(v[0])} />
          <div className="text-muted-foreground mt-1 flex justify-between text-[10px]"><span>0%</span><span>−40%</span></div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 font-medium">
              <Percent className="size-4" /> Rate shock
            </span>
            <Badge variant={rateShock > 0 ? "warning" : "muted"} className="tabular-nums">+{rateShock}bps</Badge>
          </div>
          <Slider value={[rateShock]} min={0} max={400} step={25} onValueChange={(v) => setRateShock(v[0])} />
          <div className="text-muted-foreground mt-1 flex justify-between text-[10px]"><span>0</span><span>+400bps</span></div>
        </div>
        <div className="sm:col-span-2 flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Under this scenario,</span>
          <Badge variant={tripCount ? "danger" : "success"}>
            {tripCount === 0 ? "no covenants trip" : `${tripCount} covenant${tripCount > 1 ? "s" : ""} trip`}
          </Badge>
          {(haircut > 0 || rateShock > 0) && (
            <button
              className="text-muted-foreground hover:text-foreground ml-auto text-xs underline"
              onClick={() => { setHaircut(0); setRateShock(0); }}
            >
              reset
            </button>
          )}
        </div>
      </div>

      {/* Break-even gauges */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {projections.map(({ def, base }) => {
          if (!base || base.breakevenEbitda == null || !latest) return null;
          const current = latest.facts[def.ebitdaBasis] ?? latest.facts.EBITDA_ADJ ?? 0;
          const be = base.breakevenEbitda;
          // cushion: how far EBITDA can fall before breach (for "<=" covenants
          // breakeven is below current; for ">=" also below).
          const cushionPct = current > 0 ? ((current - be) / current) * 100 : 0;
          const tone = cushionPct < 5 ? "danger" : cushionPct < 15 ? "warning" : "ok";
          return (
            <div key={def.id ?? def.name} className="rounded-xl border border-border/70 bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <Gauge className="size-4" /> {def.name}
                </span>
                <Badge variant={tone === "danger" ? "danger" : tone === "warning" ? "warning" : "success"} className="tabular-nums">
                  {cushionPct >= 0 ? cushionPct.toFixed(0) : 0}% cushion
                </Badge>
              </div>
              <div className="mt-3 flex items-end gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs">Current adj. EBITDA</div>
                  <div className="font-semibold tabular-nums">{fmtCov(current, "$MM")}</div>
                </div>
                <div className="text-muted-foreground">→</div>
                <div>
                  <div className="text-muted-foreground text-xs">Break-even EBITDA</div>
                  <div className="font-semibold tabular-nums text-[var(--warning)]">{fmtCov(be, "$MM")}</div>
                </div>
              </div>
              <div className="bg-muted mt-3 h-2 overflow-hidden rounded-full">
                <div
                  className={cn(
                    "h-full rounded-full",
                    tone === "danger" ? "bg-[var(--danger)]" : tone === "warning" ? "bg-[var(--warning)]" : "bg-[var(--success)]",
                  )}
                  style={{ width: `${Math.max(4, Math.min(100, cushionPct))}%` }}
                />
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                EBITDA can fall {cushionPct >= 0 ? cushionPct.toFixed(1) : "0"}% (to {fmtCov(be, "$MM")}) before this covenant breaches.
              </p>
            </div>
          );
        })}
      </div>

      {/* Trip matrix */}
      <div className="overflow-x-auto rounded-xl border border-border/70 bg-card">
        <div className="border-b border-border/60 px-4 py-3 text-sm font-semibold">
          Projected headroom under scenario
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-xs">
              <th className="px-3 py-2 text-left font-medium">Covenant</th>
              {periods.map((p) => (
                <th key={p.periodEnd} className="px-3 py-2 text-right font-medium whitespace-nowrap">
                  {p.periodLabel}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projections.map(({ def, points }) => (
              <tr key={def.id ?? def.name} className="border-b border-border/40">
                <td className="px-3 py-2 font-medium whitespace-nowrap">{def.name}</td>
                {points.map((pt) => (
                  <td key={pt.periodEnd} className="px-1.5 py-1.5 text-right">
                    <div
                      className={cn(
                        "rounded px-1.5 py-1 text-xs tabular-nums",
                        pt.trips
                          ? "bg-[color-mix(in_oklch,var(--danger)_22%,transparent)] text-[var(--danger)] font-semibold"
                          : pt.headroomPct < 10
                            ? "bg-[color-mix(in_oklch,var(--warning)_20%,transparent)] text-[var(--warning)]"
                            : "bg-[color-mix(in_oklch,var(--success)_15%,transparent)] text-[var(--success)]",
                      )}
                      title={`${pt.projectedValue?.toFixed(2) ?? "—"} vs ${pt.thresholdApplied}`}
                    >
                      {pt.trips ? "BREACH" : `${pt.headroomPct.toFixed(0)}%`}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
