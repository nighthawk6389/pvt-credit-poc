import { notFound } from "next/navigation";

import { getCashflow } from "@/server/queries/deal";
import { fmtMM } from "@/lib/utils";
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
import { CashflowChart } from "@/components/charts/cashflow-chart";

export default async function CashflowPage({
  params,
}: {
  params: Promise<{ dealId: string }>;
}) {
  const { dealId } = await params;
  const deal = await getCashflow(dealId);
  if (!deal) notFound();

  const cf = deal.cashflows;
  const chartData = cf.map((c) => ({
    label: c.periodLabel,
    drawdown: c.drawdown,
    paydown: c.paydown,
    interest: c.interest,
    endingBal: c.endingBal,
    isProjected: c.isProjected,
  }));

  const totalDraws = cf.reduce((s, c) => s + c.drawdown, 0);
  const totalPaydowns = cf.reduce((s, c) => s + c.paydown, 0);
  const totalInterest = cf.reduce((s, c) => s + c.interest, 0);
  const totalPik = cf.reduce((s, c) => s + c.pikAccrued, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total Drawdowns" value={fmtMM(totalDraws, 1)} />
        <Stat label="Total Paydowns" value={fmtMM(totalPaydowns, 1)} />
        <Stat label="Interest (life)" value={fmtMM(totalInterest, 1)} />
        <Stat label="PIK Accrued" value={fmtMM(totalPik, 1)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Facility Balance & Cash Flows</CardTitle>
          <CardDescription>
            Outstanding balance (line) with drawdowns & interest (bars) ·
            projected periods shaded in the schedule
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CashflowChart data={chartData} />
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <div className="border-b border-border/60 px-4 py-3">
          <h3 className="text-sm font-semibold">Amortization Schedule</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Beginning</TableHead>
              <TableHead className="text-right">Drawdown</TableHead>
              <TableHead className="text-right">Paydown</TableHead>
              <TableHead className="text-right">Interest</TableHead>
              <TableHead className="text-right">Ending</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {cf.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.periodLabel}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtMM(c.beginningBal, 1)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {c.drawdown ? (
                    <span className="text-[var(--info)]">+{fmtMM(c.drawdown, 1)}</span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {c.paydown ? (
                    <span className="text-[var(--success)]">
                      −{fmtMM(c.paydown, 1)}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-right tabular-nums">
                  {fmtMM(c.interest, 1)}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {fmtMM(c.endingBal, 1)}
                </TableCell>
                <TableCell>
                  {c.isProjected && (
                    <Badge variant="muted" className="text-[9px]">
                      proj
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="px-4">
        <div className="text-muted-foreground text-xs">{label}</div>
        <div className="text-xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
