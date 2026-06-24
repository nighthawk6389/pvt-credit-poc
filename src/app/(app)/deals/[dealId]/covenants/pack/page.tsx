import { notFound } from "next/navigation";

import { getActiveRole } from "@/lib/auth/server";
import { getCompliancePack } from "@/server/queries/covenants";
import { fmtDate } from "@/lib/utils";
import { fmtCov } from "@/components/covenants/format";
import { AccessDenied } from "@/components/deal/access-denied";
import { CovenantChip } from "@/components/deal/badges";
import { PrintButton } from "@/components/covenants/print-button";

export default async function CompliancePackPage({
  params,
}: {
  params: Promise<{ dealId: string }>;
}) {
  const { dealId } = await params;
  const role = await getActiveRole();
  const pack = await getCompliancePack(dealId, role);
  if (pack.blocked) return <AccessDenied />;
  if (!pack.deal) notFound();

  const financial = pack.items.filter((i) => i.category !== "Reporting");
  const reporting = pack.items.filter((i) => i.category === "Reporting");
  const asOf = financial[0]?.latest?.periodEnd;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-muted-foreground text-sm print-hide">
          Quarterly covenant compliance certificate
        </span>
        <PrintButton />
      </div>

      <div className="print-page rounded-xl border border-border/70 bg-card p-8">
        {/* Letterhead */}
        <div className="mb-6 flex items-start justify-between border-b border-border/60 pb-4">
          <div>
            <div className="text-lg font-semibold">Covenant Compliance Certificate</div>
            <div className="text-muted-foreground text-sm">
              {pack.deal.codeName} · {pack.deal.borrowerName}
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="text-muted-foreground">As of</div>
            <div className="font-medium">{asOf ? fmtDate(asOf) : "—"}</div>
          </div>
        </div>

        <p className="text-muted-foreground mb-6 text-xs leading-relaxed">
          The following financial covenants have been independently recomputed by
          the lender from fundamental data and reconciled against the
          borrower&apos;s reported figures. Compliance is determined on the
          recomputed value.
        </p>

        {/* Financial covenants */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="py-2 text-left font-medium">Covenant</th>
              <th className="py-2 text-left font-medium">Requirement</th>
              <th className="py-2 text-right font-medium">Recomputed</th>
              <th className="py-2 text-right font-medium">Reported</th>
              <th className="py-2 text-right font-medium">Headroom</th>
              <th className="py-2 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {financial.map((c) => {
              const l = c.latest;
              return (
                <tr key={c.id} className="border-b border-border/40 align-top">
                  <td className="py-2.5">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-muted-foreground font-mono text-[10px]">{c.formula}</div>
                  </td>
                  <td className="py-2.5 tabular-nums">
                    {c.operator} {fmtCov(l?.thresholdApplied ?? c.threshold, c.unit)}
                  </td>
                  <td className="py-2.5 text-right font-medium tabular-nums">{fmtCov(l?.recomputed, c.unit)}</td>
                  <td className="py-2.5 text-right tabular-nums text-muted-foreground">{fmtCov(l?.reported, c.unit)}</td>
                  <td className="py-2.5 text-right tabular-nums">
                    {l && l.springingActive ? `${l.headroomPct.toFixed(1)}%` : "—"}
                  </td>
                  <td className="py-2.5">{l && <CovenantChip status={l.status} />}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Reporting */}
        {reporting.length > 0 && (
          <>
            <div className="mt-6 mb-2 text-sm font-semibold">Reporting Obligations</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="py-2 text-left font-medium">Obligation</th>
                  <th className="py-2 text-left font-medium">Due</th>
                  <th className="py-2 text-left font-medium">Most recent</th>
                </tr>
              </thead>
              <tbody>
                {reporting.map((r) => {
                  const recent = r.reporting?.deliveries.findLast((d) => d.status !== "Pending");
                  return (
                    <tr key={r.id} className="border-b border-border/40">
                      <td className="py-2">{r.reporting?.kind}</td>
                      <td className="py-2 text-muted-foreground">{r.reporting?.dueDaysAfter}d after period-end</td>
                      <td className="py-2"><CovenantChip status={recent?.status ?? "Pending"} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}

        <div className="text-muted-foreground mt-8 border-t border-border/60 pt-4 text-[10px] leading-relaxed">
          Prepared by Lumen Covenant Monitoring. Recomputation sourced from
          standardized fundamental fields; figures are illustrative (POC).
          Reconciliation discrepancies beyond tolerance are flagged for review.
        </div>
      </div>
    </div>
  );
}
