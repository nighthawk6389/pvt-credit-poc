import { notFound } from "next/navigation";
import Link from "next/link";
import { Building2, MapPin, User, ArrowRight } from "lucide-react";

import { getActiveRole } from "@/lib/auth/server";
import { getBorrower } from "@/server/queries/portfolio";
import { fmtMM, fmtPct, fmtX, fmtDate } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FinancialTrend } from "@/components/charts/financial-trend";
import { AccessDenied } from "@/components/deal/access-denied";
import { RiskRatingBadge, WatchlistBadge, CovenantChip } from "@/components/deal/badges";
import { statusVariant } from "@/lib/status";

export default async function BorrowerPage({
  params,
}: {
  params: Promise<{ borrowerId: string }>;
}) {
  const { borrowerId } = await params;
  const role = await getActiveRole();
  const borrower = await getBorrower(role, borrowerId);
  if (!borrower) notFound();
  if (borrower.blocked) return <AccessDenied />;

  const fins = borrower.financials;
  const latest = [...fins].reverse().find((f) => f.isActual);
  const trend = fins.map((f) => ({
    label: f.periodLabel.replace(" 20", " '"),
    ebitda: f.ebitda,
    revenue: f.revenue,
    leverage: f.netLeverage,
    isActual: f.isActual,
  }));
  const latestVal = borrower.valuations[0];
  const allCovs = borrower.deals.flatMap((d) => d.covenants);

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{borrower.name}</h1>
            {borrower.watchlist && <WatchlistBadge />}
          </div>
          <p className="text-muted-foreground max-w-2xl text-sm">
            {borrower.description}
          </p>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="inline-flex items-center gap-1">
              <Building2 className="size-3.5" />
              {borrower.sector}
            </span>
            {borrower.hqCity && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" />
                {borrower.hqCity}
              </span>
            )}
            {borrower.ceo && (
              <span className="inline-flex items-center gap-1">
                <User className="size-3.5" />
                {borrower.ceo}
              </span>
            )}
            {borrower.sponsor && <span>· {borrower.sponsor.name}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-muted-foreground text-xs">Internal rating</div>
            <RiskRatingBadge rating={borrower.riskRating} trend={borrower.riskTrend} />
          </div>
        </div>
      </div>

      {/* Metrics */}
      {latest && (
        <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Metric label="LTM Revenue" value={fmtMM(latest.revenue, 0)} />
          <Metric label="LTM EBITDA" value={fmtMM(latest.ebitda, 0)} />
          <Metric label="Net Leverage" value={fmtX(latest.netLeverage)} />
          <Metric label="Int. Coverage" value={fmtX(latest.interestCoverage)} />
          <Metric
            label="Current Mark"
            value={latestVal ? fmtPct(latestVal.fairValuePct) : "—"}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Financial Performance</CardTitle>
            <CardDescription>Revenue & EBITDA ($MM) with leverage (x)</CardDescription>
          </CardHeader>
          <CardContent>
            <FinancialTrend data={trend} />
          </CardContent>
        </Card>

        {/* Covenant status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Covenant Status</CardTitle>
            <CardDescription>Latest maintenance tests</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {allCovs.map((c) => {
              const latestTest = [...c.tests]
                .filter((t) => t.actual != null)
                .sort((a, b) => +b.periodEnd - +a.periodEnd)[0];
              return (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{c.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {c.operator} {c.threshold}
                      {c.unit === "x" ? "x" : c.unit === "%" ? "%" : ` ${c.unit}`}
                    </div>
                  </div>
                  {latestTest ? (
                    <CovenantChip status={latestTest.status} />
                  ) : (
                    <Badge variant="muted">No test</Badge>
                  )}
                </div>
              );
            })}
            {allCovs.length === 0 && (
              <p className="text-muted-foreground text-sm">No covenants tracked.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Deals */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Facilities & Deals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {borrower.deals.map((d) => (
            <Link
              key={d.id}
              href={`/deals/${d.id}`}
              className="hover:bg-muted/40 group flex items-center gap-3 rounded-lg border border-border/60 p-3 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{d.codeName}</span>
                  <Badge variant={statusVariant(d.status)} className="text-[9px]">
                    {d.stage}
                  </Badge>
                </div>
                <div className="text-muted-foreground text-xs">
                  {d.facilityType} · {fmtMM(d.dealSize, 0)}
                  {d.facilities[0] && ` · S+${d.facilities[0].spreadBps}`}
                </div>
              </div>
              <ArrowRight className="text-muted-foreground size-4 opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="px-4">
        <div className="text-muted-foreground text-xs">{label}</div>
        <div className="text-xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
