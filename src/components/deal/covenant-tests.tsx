"use client";

import * as React from "react";
import { toast } from "sonner";

import { useRole } from "@/lib/auth/context";
import { can } from "@/lib/auth/roles";
import { fmtDate, fmtPct } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CovenantChip } from "@/components/deal/badges";
import { waiveCovenantTest } from "@/server/actions/deal-ops";

type Test = {
  id: string;
  covenant: string;
  unit: string;
  periodEnd: string;
  testDate: string;
  actual: number | null;
  threshold: number;
  operator: string;
  headroomPct: number | null;
  status: string;
};

export function CovenantTests({
  dealId,
  tests,
}: {
  dealId: string;
  tests: Test[];
}) {
  const { role } = useRole();
  const canWaive = can(role, "edit", "covenant");
  const [pending, start] = React.useTransition();

  function waive(id: string) {
    start(async () => {
      try {
        await waiveCovenantTest(dealId, id);
        toast.success("Covenant test waived");
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  const fmtVal = (v: number | null, unit: string) =>
    v == null ? "—" : unit === "x" ? `${v.toFixed(2)}x` : unit === "%" ? `${v}%` : `$${v}MM`;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Covenant</TableHead>
          <TableHead>Period</TableHead>
          <TableHead className="text-right">Threshold</TableHead>
          <TableHead className="text-right">Actual</TableHead>
          <TableHead className="text-right">Headroom</TableHead>
          <TableHead>Status</TableHead>
          {canWaive && <TableHead />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {tests.map((t) => (
          <TableRow key={t.id}>
            <TableCell className="font-medium">{t.covenant}</TableCell>
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
                t.headroomPct != null && t.headroomPct < 0
                  ? "text-[var(--danger)]"
                  : t.headroomPct != null && t.headroomPct < 10
                    ? "text-[var(--warning)]"
                    : ""
              }`}
            >
              {t.headroomPct != null ? fmtPct(t.headroomPct) : "—"}
            </TableCell>
            <TableCell>
              <CovenantChip status={t.status} />
            </TableCell>
            {canWaive && (
              <TableCell className="text-right">
                {t.status === "Breach" && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => waive(t.id)}
                  >
                    Waive
                  </Button>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
