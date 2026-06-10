import Link from "next/link";
import { LockKeyhole } from "lucide-react";

import { getActiveRole } from "@/lib/auth/server";
import { getPipeline } from "@/server/queries/portfolio";
import { fmtMM, fmtSpread, fmtX, fmtDate } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";

const COLUMNS = ["Sourcing", "Screening", "Diligence", "IC", "Docs"];

export default async function PipelinePage() {
  const role = await getActiveRole();
  const deals = await getPipeline(role);

  const byStage = (stage: string) => deals.filter((d) => d.stage === stage);
  const totalValue = deals.reduce((s, d) => s + d.size, 0);

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Deal Pipeline"
        description={`${deals.length} active opportunities · ${fmtMM(totalValue, 0)} in aggregate commitments under evaluation`}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {COLUMNS.map((stage) => {
          const items = byStage(stage);
          const value = items.reduce((s, d) => s + d.size, 0);
          return (
            <div key={stage} className="flex flex-col">
              <div className="mb-2 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{stage}</span>
                  <Badge variant="muted" className="text-[10px]">
                    {items.length}
                  </Badge>
                </div>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {fmtMM(value, 0)}
                </span>
              </div>
              <div className="bg-muted/30 flex flex-1 flex-col gap-2 rounded-lg p-2">
                {items.map((d) => (
                  <Link
                    key={d.id}
                    href={`/deals/${d.id}`}
                    className="bg-card hover:border-primary/40 group block rounded-lg border border-border/70 p-3 shadow-sm transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium">{d.codeName}</span>
                      {d.isPrivileged && (
                        <LockKeyhole className="text-muted-foreground size-3" />
                      )}
                    </div>
                    <div className="text-muted-foreground mt-0.5 truncate text-xs">
                      {d.borrower}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-[9px]">
                        {fmtMM(d.size, 0)}
                      </Badge>
                      {d.spread && (
                        <Badge variant="muted" className="text-[9px]">
                          {fmtSpread(d.spread)}
                        </Badge>
                      )}
                      {d.leverage && (
                        <Badge variant="muted" className="text-[9px]">
                          {fmtX(d.leverage)}
                        </Badge>
                      )}
                    </div>
                    <div className="text-muted-foreground mt-2 flex items-center justify-between text-[11px]">
                      <span>{d.sector}</span>
                      <span>{d.probability}%</span>
                    </div>
                    <div className="bg-muted mt-1.5 h-1 overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{ width: `${d.probability}%` }}
                      />
                    </div>
                    {d.targetClose && (
                      <div className="text-muted-foreground/70 mt-2 text-[10px]">
                        Target {fmtDate(d.targetClose)}
                      </div>
                    )}
                  </Link>
                ))}
                {items.length === 0 && (
                  <div className="text-muted-foreground/50 px-2 py-6 text-center text-xs">
                    No deals
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
