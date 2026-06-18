import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckCircle2 } from "lucide-react";

import { getActiveRole } from "@/lib/auth/server";
import { getCovenantCalendar } from "@/server/queries/portfolio";
import { getCovenantBoard } from "@/server/queries/covenants";
import { fmtDate, fmtPct } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { BoardHeatmap } from "@/components/covenants/board-heatmap";
import { Scale } from "lucide-react";
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
import { CovenantChip } from "@/components/deal/badges";

export default async function CovenantsCalendarPage() {
  const role = await getActiveRole();
  const tests = await getCovenantCalendar(role);
  const board = await getCovenantBoard(role);

  const tested = tests.filter((t) => t.status === "Pass" || t.status === "Breach");
  const breaches = tests.filter((t) => t.status === "Breach");
  const upcoming = tests
    .filter((t) => t.status === "Upcoming")
    .sort((a, b) => +new Date(a.testDate) - +new Date(b.testDate));
  const passRate = tested.length
    ? (tested.filter((t) => t.status === "Pass").length / tested.length) * 100
    : 100;

  const fmtVal = (v: number | null, unit: string) =>
    v == null ? "—" : unit === "x" ? `${v.toFixed(2)}x` : unit === "%" ? `${v}%` : `$${v}MM`;

  const recent = tested
    .sort((a, b) => +new Date(b.periodEnd) - +new Date(a.periodEnd))
    .slice(0, 25);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Covenant Compliance Calendar"
        description={`Cross-portfolio monitoring · ${tests.length} data points tracked across the book`}
      />

      {/* Covenant engine board — recompute & reconciliation across the book */}
      {board.rows.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Scale className="size-4 text-[var(--info)]" />
                Covenant Engine Board
              </CardTitle>
              <CardDescription>
                Recomputed & reconciled across {board.stats.deals} deals ·{" "}
                {board.stats.breaches} breach · {board.stats.nearBreaches} near-breach ·{" "}
                {board.stats.reconFlags} recon-flag · {board.stats.reportingLate} late filing
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <BoardHeatmap rows={board.rows} />
          </CardContent>
        </Card>
      )}

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Data points" value={String(tests.length)} icon={<CalendarClock className="size-4" />} />
        <Stat
          label="Pass rate"
          value={fmtPct(passRate)}
          icon={<CheckCircle2 className="size-4 text-[var(--success)]" />}
        />
        <Stat
          label="Active breaches"
          value={String(breaches.length)}
          tone={breaches.length ? "danger" : undefined}
          icon={<AlertTriangle className="size-4 text-[var(--danger)]" />}
        />
        <Stat label="Upcoming tests" value={String(upcoming.length)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Breaches */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-[var(--danger)]" />
              Active Breaches
            </CardTitle>
            <CardDescription>Covenants requiring waiver or remediation</CardDescription>
          </CardHeader>
          <CardContent>
            {breaches.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No active covenant breaches across the portfolio.
              </p>
            ) : (
              <div className="space-y-2">
                {breaches.map((b) => (
                  <Link
                    key={b.id}
                    href={`/deals/${b.dealId}/covenants`}
                    className="hover:bg-muted/40 flex items-center gap-3 rounded-lg border border-[color-mix(in_oklch,var(--danger)_30%,transparent)] p-3 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{b.borrower}</div>
                      <div className="text-muted-foreground text-xs">
                        {b.covenant} · {b.sector} · {fmtDate(b.periodEnd)}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-medium tabular-nums text-[var(--danger)]">
                        {fmtVal(b.actual, b.unit)}
                      </div>
                      <div className="text-muted-foreground text-xs tabular-nums">
                        limit {b.operator} {fmtVal(b.threshold, b.unit)}
                      </div>
                    </div>
                    <CovenantChip status="Breach" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Tests</CardTitle>
            <CardDescription>Compliance certificates due</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {upcoming.slice(0, 8).map((u) => (
              <Link
                key={u.id}
                href={`/deals/${u.dealId}/covenants`}
                className="hover:bg-muted/40 -mx-2 flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors"
              >
                <CalendarClock className="text-muted-foreground size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{u.borrower}</div>
                  <div className="text-muted-foreground text-xs">{u.covenant}</div>
                </div>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {fmtDate(u.testDate)}
                </span>
              </Link>
            ))}
            {upcoming.length === 0 && (
              <p className="text-muted-foreground text-sm">No upcoming tests.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Full register */}
      <Card className="mt-4 gap-0 py-0">
        <div className="border-b border-border/60 px-4 py-3">
          <h3 className="text-sm font-semibold">Recent Test Register</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Borrower</TableHead>
              <TableHead>Covenant</TableHead>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Threshold</TableHead>
              <TableHead className="text-right">Actual</TableHead>
              <TableHead className="text-right">Headroom</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recent.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <Link
                    href={`/deals/${t.dealId}/covenants`}
                    className="hover:text-primary font-medium transition-colors"
                  >
                    {t.borrower}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{t.covenant}</TableCell>
                <TableCell className="text-muted-foreground">
                  {fmtDate(t.periodEnd)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {t.operator} {fmtVal(t.threshold, t.unit)}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {fmtVal(t.actual, t.unit)}
                </TableCell>
                <TableCell
                  className={`text-right tabular-nums ${
                    t.headroomPct != null && t.headroomPct < 10
                      ? "text-[var(--warning)]"
                      : ""
                  }`}
                >
                  {t.headroomPct != null ? fmtPct(t.headroomPct) : "—"}
                </TableCell>
                <TableCell>
                  <CovenantChip status={t.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
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
  value: string;
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
      </CardContent>
    </Card>
  );
}
