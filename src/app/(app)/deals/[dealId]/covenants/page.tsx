import { notFound } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Scale, AlertTriangle, FileClock, ArrowRight } from "lucide-react";

import { getActiveRole } from "@/lib/auth/server";
import { getCovenantSuite } from "@/server/queries/covenants";
import { fmtPct } from "@/lib/utils";
import { fmtCov, categoryTone } from "@/components/covenants/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CovenantChip } from "@/components/deal/badges";
import { AccessDenied } from "@/components/deal/access-denied";
import { SuiteActions } from "@/components/covenants/suite-actions";

export default async function CovenantOverviewPage({
  params,
}: {
  params: Promise<{ dealId: string }>;
}) {
  const { dealId } = await params;
  const role = await getActiveRole();
  const suite = await getCovenantSuite(dealId, role);
  if (suite.blocked) return <AccessDenied />;
  if (!suite.deal) notFound();

  const { items, deal } = suite;
  const financial = items.filter((i) => i.category !== "Reporting");
  const reporting = items.filter((i) => i.category === "Reporting");

  const breaches = financial.filter((i) => i.latest?.status === "Breach").length;
  const nearBreaches = financial.filter((i) => i.latest?.status === "Near-breach").length;
  const reconFlags = financial.filter((i) => i.latest?.status === "Recon-flag").length;
  const lateFilings = reporting.filter((i) =>
    i.reporting?.deliveries.some((d) => d.status === "Late" || d.status === "Missing"),
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Covenant Monitoring</h2>
          <p className="text-muted-foreground text-sm">
            Independently recomputed from Bloomberg fundamental fields and
            reconciled to the borrower&apos;s compliance certificate.
          </p>
        </div>
        <SuiteActions dealId={deal.id} borrowerId={deal.borrowerId} />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Breaches" value={breaches} tone={breaches ? "danger" : undefined} icon={<AlertTriangle className="size-4" />} />
        <Stat label="Near-breaches" value={nearBreaches} tone={nearBreaches ? "warning" : undefined} icon={<ShieldCheck className="size-4" />} />
        <Stat label="Reconciliation flags" value={reconFlags} tone={reconFlags ? "warning" : undefined} icon={<Scale className="size-4" />} />
        <Stat label="Late / missing filings" value={lateFilings} tone={lateFilings ? "danger" : undefined} icon={<FileClock className="size-4" />} />
      </div>

      {/* Financial covenant cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {financial.map((c) => {
          const l = c.latest;
          return (
            <Card key={c.id}>
              <CardHeader className="gap-1">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    {c.name}
                    <Badge variant={categoryTone(c.category) as "info"} className="text-[9px]">
                      {c.category}
                    </Badge>
                    {c.hasSchedule && <Badge variant="muted" className="text-[9px]">step-down</Badge>}
                    {c.hasSpringing && <Badge variant="muted" className="text-[9px]">springing</Badge>}
                    {c.hasBasket && <Badge variant="muted" className="text-[9px]">basket</Badge>}
                  </CardTitle>
                  {l && <CovenantChip status={l.status} />}
                </div>
                <CardDescription className="font-mono text-[11px]">
                  {c.formula} {c.operator} {fmtCov(l?.thresholdApplied ?? c.threshold, c.unit)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {l && l.status !== "Upcoming" && l.status !== "N/A-springing" ? (
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <div className="text-2xl font-semibold tabular-nums">
                        {fmtCov(l.recomputed, c.unit)}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        recomputed · {l.headroomPct >= 0 ? "+" : ""}
                        {fmtPct(l.headroomPct)} headroom
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <div className="text-muted-foreground">
                        reported {fmtCov(l.reported, c.unit)}
                      </div>
                      {l.reconDelta != null && Math.abs(l.reconDelta) > 0.0001 && (
                        <div className={l.reconFlag ? "text-[var(--warning)] font-medium" : "text-muted-foreground"}>
                          Δ {l.reconDelta > 0 ? "+" : ""}
                          {l.reconDelta.toFixed(2)} ({l.reconDeltaPct}%)
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm">
                    {l?.status === "N/A-springing"
                      ? "Not tested — springing condition not met this period."
                      : "Awaiting next test period."}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Reporting covenants */}
      {reporting.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileClock className="size-4" /> Reporting Obligations
              </CardTitle>
              <CardDescription>Delivery deadlines & status</CardDescription>
            </div>
            <Link
              href={`/deals/${deal.id}/covenants/reconciliation`}
              className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
            >
              Full register <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {reporting.map((r) => {
              const next = r.reporting?.deliveries.find((d) => d.status === "Pending");
              const lastIssue = r.reporting?.deliveries.find(
                (d) => d.status === "Late" || d.status === "Missing",
              );
              return (
                <div key={r.id} className="rounded-lg border border-border/60 p-3">
                  <div className="text-sm font-medium">{r.reporting?.kind}</div>
                  <div className="text-muted-foreground text-xs">
                    Due {r.reporting?.dueDaysAfter}d after period-end
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    {lastIssue ? (
                      <CovenantChip status={lastIssue.status} />
                    ) : (
                      <CovenantChip status="Pass" />
                    )}
                    {next && <Badge variant="muted" className="text-[9px]">next pending</Badge>}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
  tone?: "danger" | "warning";
}) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="px-4">
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs [&_svg]:size-3.5">
          {icon}
          {label}
        </div>
        <div
          className={`text-2xl font-semibold tabular-nums ${
            tone === "danger" ? "text-[var(--danger)]" : tone === "warning" ? "text-[var(--warning)]" : ""
          }`}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
