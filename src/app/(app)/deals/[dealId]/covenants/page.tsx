import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { getCovenants } from "@/server/queries/deal";
import { fmtDate, fmtPct } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HeadroomChart } from "@/components/charts/headroom-chart";
import { CovenantTests } from "@/components/deal/covenant-tests";
import { CovenantChip } from "@/components/deal/badges";

export default async function CovenantsPage({
  params,
}: {
  params: Promise<{ dealId: string }>;
}) {
  const { dealId } = await params;
  const deal = await getCovenants(dealId);
  if (!deal) notFound();

  // Flatten tests for the table.
  const tests = deal.covenants
    .flatMap((c) =>
      c.tests.map((t) => ({
        id: t.id,
        covenant: c.name,
        unit: c.unit,
        operator: c.operator,
        threshold: c.threshold,
        periodEnd: t.periodEnd.toISOString(),
        testDate: t.testDate.toISOString(),
        actual: t.actual,
        headroomPct: t.headroomPct,
        status: t.status,
      })),
    )
    .sort((a, b) => +new Date(b.periodEnd) - +new Date(a.periodEnd));

  // Headroom series (maintenance covenants only) keyed by period.
  const periods = [
    ...new Set(
      deal.covenants
        .flatMap((c) => c.tests)
        .filter((t) => t.headroomPct != null)
        .map((t) => t.periodEnd.toISOString()),
    ),
  ].sort();
  const headroomData = periods.map((p) => {
    const row: { label: string; [k: string]: string | number | null } = {
      label: fmtDate(p).replace(/, \d{4}/, ""),
    };
    for (const c of deal.covenants) {
      if (c.type !== "Maintenance") continue;
      const test = c.tests.find((t) => t.periodEnd.toISOString() === p);
      if (test?.headroomPct != null) row[c.name] = test.headroomPct;
    }
    return row;
  });

  const breaches = tests.filter((t) => t.status === "Breach").length;

  return (
    <div className="space-y-4">
      {/* Covenant cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {deal.covenants.map((c) => {
          const latest = [...c.tests]
            .filter((t) => t.actual != null)
            .sort((a, b) => +b.periodEnd - +a.periodEnd)[0];
          return (
            <Card key={c.id} className="gap-3 py-4">
              <CardHeader className="px-4">
                <CardTitle className="text-sm">{c.name}</CardTitle>
                <CardDescription className="text-xs">
                  {c.type} · {c.operator} {c.threshold}
                  {c.unit === "x" ? "x" : c.unit === "%" ? "%" : ` ${c.unit}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4">
                {latest ? (
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-2xl font-semibold tabular-nums">
                        {c.unit === "x"
                          ? `${latest.actual?.toFixed(2)}x`
                          : c.unit === "%"
                            ? `${latest.actual}%`
                            : `$${latest.actual}MM`}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {latest.headroomPct != null &&
                          `${fmtPct(latest.headroomPct)} headroom`}
                      </div>
                    </div>
                    <CovenantChip status={latest.status} />
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm">No test yet</div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Headroom chart */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="size-4 text-[var(--success)]" />
              Covenant Headroom Trend
            </CardTitle>
            <CardDescription>
              Cushion to each maintenance threshold over time
            </CardDescription>
          </div>
          {breaches > 0 && (
            <Badge variant="danger">{breaches} breach{breaches > 1 ? "es" : ""}</Badge>
          )}
        </CardHeader>
        <CardContent>
          {headroomData.length > 0 ? (
            <HeadroomChart data={headroomData} />
          ) : (
            <p className="text-muted-foreground text-sm">No test history yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Test table */}
      <Card className="gap-0 py-0">
        <div className="border-b border-border/60 px-4 py-3">
          <h3 className="text-sm font-semibold">Compliance Test History</h3>
        </div>
        <div className="p-1">
          <CovenantTests dealId={dealId} tests={tests} />
        </div>
      </Card>
    </div>
  );
}
