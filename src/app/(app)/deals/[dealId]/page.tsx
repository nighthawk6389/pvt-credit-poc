import { notFound } from "next/navigation";
import { Lightbulb, CheckCircle2, Circle, ListTodo } from "lucide-react";

import { getDealOverview } from "@/server/queries/deal";
import { STAGE_ORDER } from "@/lib/status";
import { fmtMM, fmtX, fmtPct, fmtDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FinancialTrend } from "@/components/charts/financial-trend";
import { CapitalStructure } from "@/components/deal/capital-structure";
import { priorityVariant } from "@/lib/status";

export default async function DealOverviewPage({
  params,
}: {
  params: Promise<{ dealId: string }>;
}) {
  const { dealId } = await params;
  const deal = await getDealOverview(dealId);
  if (!deal) notFound();

  const fins = deal.borrower.financials;
  const latestActual = [...fins].reverse().find((f) => f.isActual);
  const trend = fins.map((f) => ({
    label: f.periodLabel.replace(" 20", " '"),
    ebitda: f.ebitda,
    revenue: f.revenue,
    leverage: f.netLeverage,
    isActual: f.isActual,
  }));

  const ddqCleared = deal.ddqItems.filter((d) => d.status === "Cleared").length;
  const stageIdx = STAGE_ORDER.indexOf(deal.stage as (typeof STAGE_ORDER)[number]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {/* Thesis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="size-4 text-[var(--warning)]" />
              Investment Thesis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p>{deal.thesis}</p>
            {deal.useOfProceeds && (
              <div className="text-muted-foreground">
                <span className="text-foreground font-medium">
                  Use of proceeds:{" "}
                </span>
                {deal.useOfProceeds}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Financial Performance</CardTitle>
            <CardDescription>
              Revenue & EBITDA ($MM) with net leverage (x) · dashed line marks
              actual vs projected
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FinancialTrend data={trend} />
            {latestActual && (
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Metric label="LTM Revenue" value={fmtMM(latestActual.revenue, 0)} />
                <Metric label="LTM EBITDA" value={fmtMM(latestActual.ebitda, 0)} />
                <Metric label="EBITDA Margin" value={fmtPct(latestActual.ebitdaMargin)} />
                <Metric label="Net Leverage" value={fmtX(latestActual.netLeverage)} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Capital structure */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Capital Structure</CardTitle>
            <CardDescription>Proposed facilities & pricing</CardDescription>
          </CardHeader>
          <CardContent>
            <CapitalStructure
              facilities={deal.facilities}
              ebitda={latestActual?.ebitda}
            />
          </CardContent>
        </Card>
      </div>

      {/* Right rail */}
      <div className="space-y-4">
        {/* Workflow progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workflow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {STAGE_ORDER.filter((s) => s !== "Passed").map((stage, i) => {
              const done = i < stageIdx;
              const current = i === stageIdx;
              return (
                <div key={stage} className="flex items-center gap-3 py-1.5">
                  {done ? (
                    <CheckCircle2 className="size-4 text-[var(--success)]" />
                  ) : (
                    <Circle
                      className={cn(
                        "size-4",
                        current ? "text-primary" : "text-muted-foreground/40",
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      "text-sm",
                      current
                        ? "font-medium"
                        : done
                          ? "text-muted-foreground"
                          : "text-muted-foreground/60",
                    )}
                  >
                    {stage}
                  </span>
                  {current && (
                    <Badge variant="warning" className="ml-auto text-[10px]">
                      Current
                    </Badge>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Snapshot */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm">
            <Row label="Target close" value={fmtDate(deal.targetClose)} />
            <Row label="Probability" value={`${deal.probability}%`} />
            <Row label="Documents" value={`${deal._count.documents}`} />
            <Row
              label="DDQ cleared"
              value={`${ddqCleared}/${deal.ddqItems.length}`}
            />
            <Row
              label="IC votes"
              value={`${deal.votes.filter((v) => v.vote === "Approve").length}/${deal.votes.length} approve`}
            />
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListTodo className="size-4" />
              Open Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {deal.tasks
              .filter((t) => t.status !== "Done")
              .slice(0, 5)
              .map((t) => (
                <div key={t.id} className="flex items-start gap-2 text-sm">
                  <Circle className="text-muted-foreground/50 mt-1 size-3" />
                  <div className="min-w-0 flex-1">
                    <div className="leading-snug">{t.title}</div>
                    <div className="text-muted-foreground text-xs">
                      {t.assignee} · due {fmtDate(t.dueDate)}
                    </div>
                  </div>
                  <Badge variant={priorityVariant(t.priority)} className="text-[9px]">
                    {t.priority}
                  </Badge>
                </div>
              ))}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Latest Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {deal.notes.slice(0, 3).map((n) => (
              <div key={n.id} className="text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{n.title}</span>
                  <Badge variant="muted" className="text-[9px]">
                    {n.kind === "MgmtCall" ? "Mgmt Call" : n.kind}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs leading-relaxed">
                  {n.body}
                </p>
                <Separator className="mt-3" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
