import Link from "next/link";
import { TrendingUp, Wallet, PiggyBank, Percent } from "lucide-react";

import { getActiveRole } from "@/lib/auth/server";
import { getReturns } from "@/server/queries/returns";
import { fmtMM, fmtPct, fmtDate } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReturnsChart } from "@/components/charts/returns-chart";
import { WatchlistBadge } from "@/components/deal/badges";

export default async function ReturnsPage() {
  const role = await getActiveRole();
  const { positions, summary } = await getReturns(role);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Returns Analytics"
        description={`Gross unlevered returns across ${positions.length} funded positions · as of ${fmtDate(summary.asOf)} · simulated cash flows`}
      />

      {/* Summary KPIs */}
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Invested Capital"
          value={fmtMM(summary.invested, 0)}
          icon={<Wallet />}
        />
        <Stat
          label="Portfolio MOIC"
          value={summary.portfolioMoic ? `${summary.portfolioMoic.toFixed(2)}x` : "—"}
          sub={`${fmtMM(summary.totalValue, 0)} total value`}
          icon={<PiggyBank />}
        />
        <Stat
          label="Weighted Gross IRR"
          value={summary.weightedIrrPct != null ? fmtPct(summary.weightedIrrPct) : "—"}
          icon={<TrendingUp />}
        />
        <Stat
          label="Realized / Unrealized"
          value={fmtMM(summary.realized, 0)}
          sub={`${summary.unrealized >= 0 ? "+" : ""}${fmtMM(summary.unrealized, 1)} unrealized`}
          icon={<Percent />}
          tone={summary.unrealized >= 0 ? undefined : "danger"}
        />
      </div>

      {/* IRR by position */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Gross IRR by Position</CardTitle>
          <CardDescription>
            Entry net of OID, quarterly coupons at SOFR + spread, residual at
            current mark · amber = watchlist
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReturnsChart
            data={positions.map((p) => ({
              name: p.borrower,
              irrPct: p.irrPct,
              moic: p.moic,
              watchlist: p.watchlist,
            }))}
          />
        </CardContent>
      </Card>

      {/* Position detail */}
      <Card className="gap-0 py-0">
        <div className="border-b border-border/60 px-4 py-3">
          <h3 className="text-sm font-semibold">Position-Level Returns</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Borrower</TableHead>
              <TableHead>Entry</TableHead>
              <TableHead className="text-right">Invested</TableHead>
              <TableHead className="text-right">Interest + Fees</TableHead>
              <TableHead className="text-right">Residual</TableHead>
              <TableHead className="text-right">MOIC</TableHead>
              <TableHead className="text-right">Cash Yield</TableHead>
              <TableHead className="text-right">Gross IRR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.map((p) => (
              <TableRow key={p.dealId}>
                <TableCell>
                  <Link
                    href={`/portfolio/${p.borrowerId}`}
                    className="hover:text-primary font-medium transition-colors"
                  >
                    {p.borrower}
                  </Link>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="text-muted-foreground text-xs">{p.sector}</span>
                    {p.watchlist && <WatchlistBadge />}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {fmtDate(p.entryDate)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtMM(p.invested, 1)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtMM(p.interestReceived + p.feesReceived, 1)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtMM(p.residualValue, 1)}
                  {p.mark != null && (
                    <span className="text-muted-foreground ml-1 text-xs">
                      @{fmtPct(p.mark, { dp: 1 })}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {p.moic != null ? `${p.moic.toFixed(2)}x` : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {p.cashYieldPct != null ? fmtPct(p.cashYieldPct) : "—"}
                </TableCell>
                <TableCell
                  className={`text-right font-medium tabular-nums ${
                    (p.irrPct ?? 0) < 0 ? "text-[var(--danger)]" : ""
                  }`}
                >
                  {p.irrPct != null ? fmtPct(p.irrPct) : "—"}
                </TableCell>
              </TableRow>
            ))}
            {positions.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground text-center">
                  No funded positions visible at your access level.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <p className="text-muted-foreground mt-3 text-xs">
        Methodology: entry outflow = funded × (1 − OID) net of upfront fees;
        quarterly coupons at SOFR ({"4.35%"}) + contractual spread; residual at the
        latest fair-value mark. IRR solved on dated cash flows (XIRR). Gross,
        unlevered, before management fees and expenses.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  tone?: "danger";
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
            tone === "danger" ? "text-[var(--danger)]" : ""
          }`}
        >
          {value}
        </div>
        {sub && <div className="text-muted-foreground text-xs">{sub}</div>}
      </CardContent>
    </Card>
  );
}
