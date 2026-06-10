import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  Layers,
  AlertTriangle,
  ShieldAlert,
  Gauge,
  ArrowRight,
  CircleDot,
} from "lucide-react";

import { getActiveRole } from "@/lib/auth/server";
import { getDashboardData } from "@/server/queries/dashboard";
import { ROLE_META } from "@/lib/auth/roles";
import { fmtMM, fmtPct, fmtX, fmtSpread, fmtDate } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { KpiCard } from "@/components/charts/kpi-card";
import { ExposureDonut } from "@/components/charts/exposure-donut";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CovenantChip, RiskRatingBadge } from "@/components/deal/badges";

export default async function DashboardPage() {
  const role = await getActiveRole();
  const data = await getDashboardData(role);
  const { kpis } = data;
  const meta = ROLE_META[role];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Portfolio Dashboard"
        description={`Welcome back, ${meta.person.split(" ")[0]}. Here's the book as of ${fmtDate(new Date())}.`}
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/pipeline">
            View pipeline <ArrowRight className="size-4" />
          </Link>
        </Button>
      </PageHeader>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Committed Capital"
          value={fmtMM(kpis.totalCommitted, 0)}
          sublabel={`${fmtMM(kpis.totalFunded, 0)} funded`}
          icon={<Wallet />}
          spark={[42, 48, 55, 61, 68, 74, 80, kpis.totalCommitted / 25]}
        />
        <KpiCard
          label="Weighted Yield"
          value={kpis.weightedYieldPct ? fmtPct(kpis.weightedYieldPct) : "—"}
          delta="PORT"
          deltaTone="neutral"
          sublabel={`${fmtSpread(kpis.weightedSpreadBps)} avg`}
          icon={<TrendingUp />}
          spark={[10.2, 10.4, 10.3, 10.6, 10.8, 10.7, 10.9, kpis.weightedYieldPct ?? 11]}
          sparkColor="var(--chart-3)"
        />
        <KpiCard
          label="Weighted Leverage"
          value={kpis.weightedLeverage ? fmtX(kpis.weightedLeverage) : "—"}
          sublabel={`1y VaR ${fmtPct(kpis.var95Pct)}`}
          icon={<Gauge />}
          spark={[4.8, 4.7, 4.6, 4.5, 4.5, 4.4, 4.4, kpis.weightedLeverage ?? 4.4]}
          sparkColor="var(--chart-4)"
        />
        <KpiCard
          label="Active Pipeline"
          value={kpis.activeCount}
          sublabel={`${fmtMM(data.pipelineValue, 0)} in flight`}
          icon={<Layers />}
          spark={[2, 3, 3, 4, 4, 5, 5, kpis.activeCount]}
          sparkColor="var(--chart-2)"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Sector exposure */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Sector Exposure</CardTitle>
            <CardDescription>
              By committed capital across {kpis.closedCount} funded positions ·
              Bloomberg PORT
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExposureDonut data={data.sectorExposure} nameKey="sector" />
          </CardContent>
        </Card>

        {/* Risk flags */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="size-4 text-[var(--warning)]" />
              Risk Flags
            </CardTitle>
            <CardDescription>Watchlist & covenant breaches</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/60 p-3">
                <div className="text-2xl font-semibold tabular-nums">
                  {kpis.watchlistCount}
                </div>
                <div className="text-muted-foreground text-xs">On watchlist</div>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <div className="text-2xl font-semibold tabular-nums text-[var(--danger)]">
                  {kpis.breachCount}
                </div>
                <div className="text-muted-foreground text-xs">Covenant breaches</div>
              </div>
            </div>
            {data.breaches.slice(0, 3).map((b) => (
              <Link
                key={b.id}
                href={`/portfolio/${b.borrowerId}`}
                className="hover:bg-muted/50 flex items-center gap-2 rounded-md border border-border/50 p-2.5 text-sm transition-colors"
              >
                <AlertTriangle className="size-4 shrink-0 text-[var(--danger)]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{b.borrower}</div>
                  <div className="text-muted-foreground text-xs">
                    {b.covenant}: {fmtX(b.actual ?? 0)} vs {fmtX(b.threshold)} limit
                  </div>
                </div>
                <CovenantChip status="Breach" />
              </Link>
            ))}
            {data.breaches.length === 0 && (
              <p className="text-muted-foreground text-sm">
                No active covenant breaches.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Watchlist */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Watchlist</CardTitle>
            <CardDescription>
              Positions under heightened monitoring
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.watchlist.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No positions on the watchlist.
              </p>
            ) : (
              <div className="divide-y divide-border/60">
                {data.watchlist.map((w) => (
                  <Link
                    key={w.borrowerId}
                    href={`/portfolio/${w.borrowerId}`}
                    className="hover:bg-muted/40 -mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{w.name}</div>
                      <div className="text-muted-foreground text-xs">
                        {w.sector} · {fmtMM(w.size, 0)}
                      </div>
                    </div>
                    {w.mark != null && (
                      <div className="text-right">
                        <div className="text-sm font-medium tabular-nums">
                          {fmtPct(w.mark)}
                        </div>
                        <div className="text-muted-foreground text-[10px]">
                          mark
                        </div>
                      </div>
                    )}
                    <RiskRatingBadge rating={w.rating} trend={w.trend} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming covenant tests */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Covenant Tests</CardTitle>
            <CardDescription>Next compliance certificates due</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {data.upcoming.length === 0 ? (
              <p className="text-muted-foreground text-sm">No upcoming tests.</p>
            ) : (
              data.upcoming.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-2.5 text-sm"
                >
                  <CircleDot className="size-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{u.borrower}</div>
                    <div className="text-muted-foreground text-xs">
                      {u.covenant} {u.operator} {u.threshold}
                      {u.unit === "x" ? "x" : u.unit === "%" ? "%" : ""}
                    </div>
                  </div>
                  <Badge variant="muted" className="shrink-0">
                    {fmtDate(u.testDate)}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.activity.map((a) => (
              <div key={a.id} className="flex items-start gap-3 text-sm">
                <div className="bg-primary/15 text-primary mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold">
                  {a.actor
                    .split(" ")
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{a.actor}</span>{" "}
                  <span className="text-muted-foreground">{a.action}</span>
                  {a.target && <span className="font-medium"> · {a.target}</span>}
                </div>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {fmtDate(a.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
