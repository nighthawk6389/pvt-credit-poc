import { notFound } from "next/navigation";
import { TrendingUp, Activity, Star } from "lucide-react";

import { getStructuring } from "@/server/queries/deal";
import { bloomberg } from "@/lib/bloomberg/client";
import { fmtMM, fmtSpread, fmtPct, fmtX, fmtDate } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CapitalStructure } from "@/components/deal/capital-structure";
import { BloombergPanel } from "@/components/deal/bloomberg-panel";

export default async function StructuringPage({
  params,
}: {
  params: Promise<{ dealId: string }>;
}) {
  const { dealId } = await params;
  const deal = await getStructuring(dealId);
  if (!deal) notFound();

  const fin = deal.borrower.financials[0];
  const lead = deal.facilities[0];
  const leverage = fin?.netLeverage ?? 4.4;

  // Bloomberg analytics (simulated adapter).
  const [comps, scenarios, drsk, crpr] = await Promise.all([
    bloomberg.getDirectLendingComps(deal.borrower.sector),
    bloomberg.runStructuringScenarios({
      borrower: deal.borrower.name,
      spreadBps: lead?.spreadBps ?? 575,
      floorBps: lead?.floorBps ?? 100,
      oidPct: lead?.oidPct ?? 1,
      leverage,
    }),
    bloomberg.getDefaultRisk(deal.borrower.name, leverage),
    bloomberg.getCreditProfile(deal.borrower.name, "3"),
  ]);

  // Sources & uses (illustrative).
  const totalDebt = deal.facilities.reduce((s, f) => s + f.commitment, 0);
  const equity = +(deal.dealSize * 0.95).toFixed(0);
  const uses = [
    { label: "Purchase equity / refinance debt", amt: totalDebt + equity - 12 },
    { label: "Fees & expenses", amt: 8 },
    { label: "Cash to balance sheet", amt: 4 },
  ];
  const totalUses = uses.reduce((s, u) => s + u.amt, 0);
  const sources = [
    ...deal.facilities.map((f) => ({ label: f.name, amt: f.commitment })),
    { label: "Sponsor equity", amt: +(totalUses - totalDebt).toFixed(0) },
  ];

  return (
    <div className="space-y-4">
      {/* Term sheet + Sources & Uses */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Indicative Term Sheet</CardTitle>
            <CardDescription>Proposed structure & pricing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <CapitalStructure facilities={deal.facilities} ebitda={fin?.ebitda} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Term label="Base rate" value="SOFR" />
              <Term label="Floor" value={`${((lead?.floorBps ?? 100) / 100).toFixed(2)}%`} />
              <Term label="OID" value={`${(100 - (lead?.oidPct ?? 1)).toFixed(2)}`} />
              <Term label="Tenor" value="5 yrs" />
              <Term label="All-in yield" value={fmtPct(scenarios[0]?.allInYieldPct)} />
              <Term label="WA life" value={`${scenarios[0]?.waLifeYrs}y`} />
              <Term label="Maturity" value={fmtDate(lead?.maturity)} />
              <Term label="Thru leverage" value={fmtX(leverage)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sources & Uses</CardTitle>
            <CardDescription>{fmtMM(totalUses, 0)} total</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <div className="text-muted-foreground mb-1.5 text-xs font-medium uppercase">
                Sources
              </div>
              {sources.map((s) => (
                <div key={s.label} className="flex justify-between py-1">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="font-medium tabular-nums">{fmtMM(s.amt, 0)}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="text-muted-foreground mb-1.5 text-xs font-medium uppercase">
                Uses
              </div>
              {uses.map((u) => (
                <div key={u.label} className="flex justify-between py-1">
                  <span className="text-muted-foreground">{u.label}</span>
                  <span className="font-medium tabular-nums">{fmtMM(u.amt, 0)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bloomberg structuring scenarios */}
      <BloombergPanel fn="DLIB" title="Structuring Scenarios">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Scenario</TableHead>
              <TableHead className="text-right">Spread</TableHead>
              <TableHead className="text-right">OID</TableHead>
              <TableHead className="text-right">All-in Yield</TableHead>
              <TableHead className="text-right">WA Life</TableHead>
              <TableHead className="text-right">Net Lev.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scenarios.map((s, i) => (
              <TableRow key={s.scenario} className={i === 0 ? "bg-muted/30" : ""}>
                <TableCell className="font-medium">
                  {s.scenario}
                  {i === 0 && (
                    <Badge variant="info" className="ml-2 text-[9px]">
                      proposed
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtSpread(s.spreadBps)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {(100 - s.oidPct).toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {fmtPct(s.allInYieldPct)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {s.waLifeYrs}y
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtX(s.netLeverage)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </BloombergPanel>

      {/* DLEN comps */}
      <BloombergPanel fn="DLEN" title={`Direct Lending Comparables — ${deal.borrower.sector}`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Borrower</TableHead>
              <TableHead>Facility</TableHead>
              <TableHead className="text-right">Size</TableHead>
              <TableHead className="text-right">Spread</TableHead>
              <TableHead className="text-right">Leverage</TableHead>
              <TableHead className="text-right">Yield</TableHead>
              <TableHead className="text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comps.map((c, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{c.borrower}</TableCell>
                <TableCell className="text-muted-foreground">{c.facility}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtMM(c.size, 0)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtSpread(c.spreadBps)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtX(c.leverage)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtPct(c.yieldPct)}
                </TableCell>
                <TableCell className="text-muted-foreground text-right text-xs">
                  {fmtDate(c.date)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </BloombergPanel>

      {/* Risk panels */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BloombergPanel fn="DRSK" title="Default Risk">
          <div className="grid grid-cols-2 gap-4">
            <RiskMetric
              icon={<Activity className="size-4" />}
              label="1Y Default Prob."
              value={fmtPct(drsk.oneYrPdPct)}
            />
            <RiskMetric
              icon={<TrendingUp className="size-4" />}
              label="Implied Rating"
              value={drsk.impliedRating}
            />
            <RiskMetric label="5Y Default Prob." value={fmtPct(drsk.fiveYrPdPct)} />
            <RiskMetric label="Distance to Default" value={`${drsk.distanceToDefault}σ`} />
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Trend:</span>
            <Badge
              variant={
                drsk.trend === "Improving"
                  ? "success"
                  : drsk.trend === "Deteriorating"
                    ? "danger"
                    : "muted"
              }
            >
              {drsk.trend}
            </Badge>
          </div>
        </BloombergPanel>

        <BloombergPanel fn="CRPR" title="Credit Profile">
          <div className="space-y-2">
            {crpr.agencyRatings.map((r) => (
              <div
                key={r.agency}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">{r.agency}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium tabular-nums">{r.rating}</span>
                  <Badge variant="muted" className="text-[9px]">
                    {r.outlook}
                  </Badge>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-border/50 pt-2 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Star className="size-3.5" />
                Internal rating
              </span>
              <span className="font-medium">{crpr.internalRating}/7</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Spread to benchmark</span>
              <span className="font-medium tabular-nums">
                {fmtSpread(crpr.spreadToBenchmarkBps)}
              </span>
            </div>
          </div>
        </BloombergPanel>
      </div>
    </div>
  );
}

function Term({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 p-2.5">
      <div className="text-muted-foreground text-[11px]">{label}</div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function RiskMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs [&_svg]:size-3.5">
        {icon}
        {label}
      </div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
