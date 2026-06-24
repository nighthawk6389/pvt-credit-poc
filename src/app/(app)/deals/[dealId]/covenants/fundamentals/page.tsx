import { notFound } from "next/navigation";
import { Database } from "lucide-react";

import { getActiveRole } from "@/lib/auth/server";
import { getCovenantSuite } from "@/server/queries/covenants";
import { FIELD_LIBRARY } from "@/lib/covenants";
import { fmtDate } from "@/lib/utils";
import { AccessDenied } from "@/components/deal/access-denied";
import { AddbackWaterfall } from "@/components/covenants/addback-waterfall";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function FundamentalsPage({
  params,
}: {
  params: Promise<{ dealId: string }>;
}) {
  const { dealId } = await params;
  const role = await getActiveRole();
  const suite = await getCovenantSuite(dealId, role);
  if (suite.blocked) return <AccessDenied />;
  if (!suite.deal) notFound();

  const latestPeriod = suite.facts[suite.facts.length - 1];
  const gaapEbitda = latestPeriod?.facts.EBITDA ?? 0;

  const fmtVal = (code: string, v: number) => {
    const unit = FIELD_LIBRARY[code]?.unit;
    return unit === "%" ? `${v.toFixed(1)}%` : unit === "x" ? `${v.toFixed(2)}x` : `$${v.toFixed(1)}MM`;
  };

  const fields = latestPeriod
    ? Object.entries(latestPeriod.facts)
        .filter(([code]) => FIELD_LIBRARY[code])
        .sort((a, b) => (FIELD_LIBRARY[a[0]].category > FIELD_LIBRARY[b[0]].category ? 1 : -1))
    : [];

  return (
    <div className="space-y-4">
      {/* Add-back bridge */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adjusted EBITDA Bridge</CardTitle>
          <CardDescription>
            GAAP → covenant-defined Adjusted EBITDA for{" "}
            {suite.latestAdjPeriod ? fmtDate(suite.latestAdjPeriod) : "the latest period"} ·
            cap enforcement & quality flags
          </CardDescription>
        </CardHeader>
        <CardContent>
          {suite.latestAdjustments.length > 0 ? (
            <AddbackWaterfall gaapEbitda={gaapEbitda} adjustments={suite.latestAdjustments} />
          ) : (
            <p className="text-muted-foreground text-sm">No add-backs recorded.</p>
          )}
        </CardContent>
      </Card>

      {/* Fundamental fields */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="size-4" /> Fundamental Fields
            </CardTitle>
            <CardDescription>
              Bloomberg FA field set ·{" "}
              {latestPeriod ? fmtDate(latestPeriod.periodEnd) : "latest"} (LTM)
            </CardDescription>
          </div>
          <Badge variant="muted" className="font-mono text-[10px]">FA &lt;GO&gt;</Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
            {fields.map(([code, value]) => (
              <div key={code} className="flex items-center justify-between border-b border-border/40 py-1.5 text-sm">
                <span className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-muted-foreground">{code}</span>
                  <span className="text-muted-foreground">{FIELD_LIBRARY[code]?.label}</span>
                  {FIELD_LIBRARY[code]?.category === "Derived" && (
                    <Badge variant="muted" className="text-[9px]">derived</Badge>
                  )}
                </span>
                <span className="font-medium tabular-nums">{fmtVal(code, value)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
