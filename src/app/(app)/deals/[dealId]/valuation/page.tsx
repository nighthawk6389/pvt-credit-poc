import { notFound } from "next/navigation";
import { Scale, TrendingUp } from "lucide-react";

import { getValuation } from "@/server/queries/deal";
import { fmtMM, fmtPct, fmtDate, fmtX } from "@/lib/utils";
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
import { statusVariant } from "@/lib/status";
import { AddValuation } from "@/components/deal/add-valuation";

export default async function ValuationPage({
  params,
}: {
  params: Promise<{ dealId: string }>;
}) {
  const { dealId } = await params;
  const deal = await getValuation(dealId);
  if (!deal) notFound();

  const vals = deal.borrower.valuations;
  const latest = vals[0];
  const cost = deal.dealSize;
  const fin = [...deal.borrower.financials].reverse().find((f) => f.isActual);

  // Simple illustrative DCF: PV of contractual interest + principal at exit.
  const spread = deal.facilities[0]?.spreadBps ?? 575;
  const coupon = (spread / 100 + 4.35) / 100;
  const rate = (latest?.discountRate ?? 10) / 100;
  const years = 5;
  let pv = 0;
  const flows: { year: string; cf: number; pv: number }[] = [];
  for (let y = 1; y <= years; y++) {
    const principal = y === years ? cost : 0;
    const cf = cost * coupon + principal;
    const disc = cf / Math.pow(1 + rate, y);
    pv += disc;
    flows.push({ year: `Y${y}`, cf: +cf.toFixed(1), pv: +disc.toFixed(1) });
  }
  const dcfPct = (pv / cost) * 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Scale className="size-4" /> Fair-Value Marks
          </h2>
          <p className="text-muted-foreground text-sm">
            ASC 820 fair value · valuation committee
          </p>
        </div>
        <AddValuation dealId={dealId} borrowerId={deal.borrower.id} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard
          label="Current Mark"
          value={latest ? fmtPct(latest.fairValuePct) : "—"}
          sub={latest ? `${latest.method} · ${fmtMM(latest.fairValueAmt)}` : undefined}
        />
        <SummaryCard label="Cost Basis" value={fmtMM(cost, 0)} sub="at par" />
        <SummaryCard
          label="Unrealized G/L"
          value={
            latest ? fmtMM(latest.fairValueAmt - cost, 1) : "—"
          }
          tone={latest && latest.fairValueAmt >= cost ? "up" : "down"}
        />
        <SummaryCard
          label="Discount Rate"
          value={latest ? fmtPct(latest.discountRate) : "—"}
          sub={fin ? `${fmtX(fin.netLeverage)} leverage` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Marks history */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Valuation History</CardTitle>
            <CardDescription>Marks by method & committee status</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>As of</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">% of Par</TableHead>
                  <TableHead className="text-right">Fair Value</TableHead>
                  <TableHead className="text-right">Disc. Rate</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vals.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>{fmtDate(v.asOf)}</TableCell>
                    <TableCell className="font-medium">{v.method}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtPct(v.fairValuePct)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtMM(v.fairValueAmt)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtPct(v.discountRate)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(v.status)}>{v.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {vals.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground text-center">
                      No marks recorded yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {latest?.note && (
              <p className="text-muted-foreground mt-3 text-xs italic">
                Latest committee note: {latest.note}
              </p>
            )}
          </CardContent>
        </Card>

        {/* DCF cross-check */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4" />
              DCF Cross-check
            </CardTitle>
            <CardDescription>
              PV of contractual cash flows @ {fmtPct(latest?.discountRate ?? 10)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 rounded-lg border border-border/60 p-3">
              <div className="text-muted-foreground text-xs">Implied value</div>
              <div className="text-2xl font-semibold tabular-nums">
                {fmtPct(dcfPct)}
              </div>
              <div className="text-muted-foreground text-xs">
                {fmtMM(pv, 1)} of {fmtMM(cost, 0)} par
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Yr</TableHead>
                  <TableHead className="text-right">Cash Flow</TableHead>
                  <TableHead className="text-right">PV</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flows.map((f) => (
                  <TableRow key={f.year}>
                    <TableCell>{f.year}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtMM(f.cf, 1)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtMM(f.pv, 1)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "up" | "down";
}) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="px-4">
        <div className="text-muted-foreground text-xs">{label}</div>
        <div
          className={`text-2xl font-semibold tabular-nums ${
            tone === "up"
              ? "text-[var(--success)]"
              : tone === "down"
                ? "text-[var(--danger)]"
                : ""
          }`}
        >
          {value}
        </div>
        {sub && <div className="text-muted-foreground text-xs">{sub}</div>}
      </CardContent>
    </Card>
  );
}
