import { AlertTriangle, Lock, Unlock } from "lucide-react";

import { cn, fmtMM } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type Adjustment = {
  id: string;
  label: string;
  amount: number;
  category: string;
  capped: boolean;
  aggressiveFlag: boolean;
  uncapped: boolean;
  source: string | null;
};

/**
 * GAAP → Adjusted EBITDA bridge. Enforces the add-back cap (≤ 25% of GAAP
 * EBITDA on capped items) and flags aggressive / uncapped run-rate items.
 */
export function AddbackWaterfall({
  gaapEbitda,
  adjustments,
  capPctOfGaap = 25,
}: {
  gaapEbitda: number;
  adjustments: Adjustment[];
  capPctOfGaap?: number;
}) {
  const totalAddbacks = adjustments.reduce((s, a) => s + a.amount, 0);
  const adjEbitda = gaapEbitda + totalAddbacks;
  const cappedTotal = adjustments.filter((a) => a.capped).reduce((s, a) => s + a.amount, 0);
  const capLimit = (gaapEbitda * capPctOfGaap) / 100;
  const capBreached = cappedTotal > capLimit;
  const uncappedTotal = adjustments.filter((a) => a.uncapped).reduce((s, a) => s + a.amount, 0);
  const max = adjEbitda * 1.05;

  // running cumulative for floating bars (immutable: start = GAAP + prior add-backs)
  const segs = adjustments.map((a, i) => ({
    ...a,
    start: gaapEbitda + adjustments.slice(0, i).reduce((s, x) => s + x.amount, 0),
  }));

  const pct = (v: number) => `${Math.max(0, (v / max) * 100)}%`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Mini label="GAAP EBITDA" value={fmtMM(gaapEbitda)} />
        <Mini label="Total add-backs" value={fmtMM(totalAddbacks)} sub={`${((totalAddbacks / gaapEbitda) * 100).toFixed(0)}% of GAAP`} />
        <Mini label="Adjusted EBITDA" value={fmtMM(adjEbitda)} accent />
        <Mini
          label={`Capped add-backs / ${capPctOfGaap}% cap`}
          value={`${fmtMM(cappedTotal)} / ${fmtMM(capLimit)}`}
          tone={capBreached ? "danger" : "ok"}
        />
      </div>

      {/* Waterfall */}
      <div className="space-y-1.5">
        <WaterRow label="GAAP EBITDA" badge={null}>
          <div className="bg-muted-foreground/40 h-6 rounded" style={{ width: pct(gaapEbitda), marginLeft: 0 }} />
          <span className="text-xs tabular-nums">{fmtMM(gaapEbitda)}</span>
        </WaterRow>

        {segs.map((s) => (
          <WaterRow
            key={s.id}
            label={s.label}
            badge={
              s.uncapped ? (
                <Badge variant="warning" className="gap-0.5 text-[9px]"><Unlock className="size-2.5" />uncapped</Badge>
              ) : s.capped ? (
                <Badge variant="muted" className="gap-0.5 text-[9px]"><Lock className="size-2.5" />capped</Badge>
              ) : null
            }
            flag={s.aggressiveFlag}
          >
            <div className="h-6 rounded bg-transparent" style={{ width: pct(s.start) }} />
            <div
              className={cn(
                "h-6 rounded",
                s.aggressiveFlag ? "bg-[var(--warning)]" : "bg-[var(--chart-3)]",
              )}
              style={{ width: pct(s.amount), marginLeft: "-2px" }}
            />
            <span className="text-xs tabular-nums">+{fmtMM(s.amount)}</span>
          </WaterRow>
        ))}

        <WaterRow label="Adjusted EBITDA" badge={null} bold>
          <div className="bg-primary h-6 rounded" style={{ width: pct(adjEbitda) }} />
          <span className="text-xs font-semibold tabular-nums">{fmtMM(adjEbitda)}</span>
        </WaterRow>
      </div>

      {(capBreached || uncappedTotal > 0) && (
        <div className="space-y-1.5">
          {capBreached && (
            <div className="flex items-center gap-2 rounded-md border border-[color-mix(in_oklch,var(--danger)_30%,transparent)] bg-[color-mix(in_oklch,var(--danger)_8%,transparent)] px-3 py-2 text-xs">
              <AlertTriangle className="size-3.5 text-[var(--danger)]" />
              Capped add-backs ({fmtMM(cappedTotal)}) exceed the {capPctOfGaap}% cap ({fmtMM(capLimit)}). Excess should be disallowed.
            </div>
          )}
          {uncappedTotal > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-[color-mix(in_oklch,var(--warning)_30%,transparent)] bg-[color-mix(in_oklch,var(--warning)_8%,transparent)] px-3 py-2 text-xs">
              <AlertTriangle className="size-3.5 text-[var(--warning)]" />
              {fmtMM(uncappedTotal)} of add-backs are uncapped run-rate / pro-forma items ({((uncappedTotal / adjEbitda) * 100).toFixed(0)}% of Adjusted EBITDA) — quality-of-earnings concern.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WaterRow({
  label,
  badge,
  flag,
  bold,
  children,
}: {
  label: string;
  badge: React.ReactNode;
  flag?: boolean;
  bold?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn("flex w-56 shrink-0 items-center gap-1.5 text-xs", bold ? "font-semibold" : "")}>
        {flag && <AlertTriangle className="size-3 text-[var(--warning)]" />}
        <span className="truncate">{label}</span>
        {badge}
      </div>
      <div className="flex flex-1 items-center gap-1.5">{children}</div>
    </div>
  );
}

function Mini({ label, value, sub, accent, tone }: { label: string; value: string; sub?: string; accent?: boolean; tone?: "ok" | "danger" }) {
  return (
    <div className={cn("rounded-lg border border-border/60 p-2.5", accent && "border-primary/40 bg-primary/5")}>
      <div className="text-muted-foreground text-[11px]">{label}</div>
      <div className={cn("text-sm font-semibold tabular-nums", tone === "danger" && "text-[var(--danger)]")}>{value}</div>
      {sub && <div className="text-muted-foreground text-[10px]">{sub}</div>}
    </div>
  );
}
