import { notFound } from "next/navigation";
import {
  FileSignature,
  Handshake,
  ArrowDownToLine,
  ArrowUpFromLine,
  Percent,
  AlertTriangle,
  Bell,
} from "lucide-react";

import { getEvents } from "@/server/queries/deal";
import { fmtMM, fmtDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { LogEvent } from "@/components/deal/log-event";

const EVENT_ICON: Record<string, typeof Bell> = {
  Amendment: FileSignature,
  Waiver: Handshake,
  Drawdown: ArrowDownToLine,
  Paydown: ArrowUpFromLine,
  RateReset: Percent,
  Restructuring: AlertTriangle,
  Notice: Bell,
};

const EVENT_TONE: Record<string, string> = {
  Restructuring: "text-[var(--danger)] bg-[color-mix(in_oklch,var(--danger)_15%,transparent)]",
  Waiver: "text-[var(--warning)] bg-[color-mix(in_oklch,var(--warning)_15%,transparent)]",
  Drawdown: "text-[var(--info)] bg-[color-mix(in_oklch,var(--info)_15%,transparent)]",
  Paydown: "text-[var(--success)] bg-[color-mix(in_oklch,var(--success)_15%,transparent)]",
};

export default async function EventsPage({
  params,
}: {
  params: Promise<{ dealId: string }>;
}) {
  const { dealId } = await params;
  const deal = await getEvents(dealId);
  if (!deal) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Lifecycle Events</h2>
          <p className="text-muted-foreground text-sm">
            Amendments, waivers, drawdowns, paydowns & notices
          </p>
        </div>
        <LogEvent dealId={dealId} />
      </div>

      <div className="relative space-y-0 pl-2">
        {deal.events.map((e, i) => {
          const Icon = EVENT_ICON[e.type] ?? Bell;
          const tone = EVENT_TONE[e.type] ?? "text-muted-foreground bg-muted";
          const last = i === deal.events.length - 1;
          return (
            <div key={e.id} className="relative flex gap-4 pb-6">
              {!last && (
                <span className="bg-border absolute top-9 left-[15px] h-full w-px" />
              )}
              <div
                className={`z-10 flex size-8 shrink-0 items-center justify-center rounded-full ${tone}`}
              >
                <Icon className="size-4" />
              </div>
              <div className="bg-card flex-1 rounded-xl border border-border/70 p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{e.title}</span>
                  <Badge variant="muted" className="text-[9px]">
                    {e.type}
                  </Badge>
                  <Badge
                    variant={e.status === "Pending" ? "warning" : "success"}
                    className="text-[9px]"
                  >
                    {e.status}
                  </Badge>
                  {e.amount != null && (
                    <span className="text-sm font-semibold tabular-nums">
                      {fmtMM(e.amount, 1)}
                    </span>
                  )}
                  <span className="text-muted-foreground ml-auto text-xs">
                    {fmtDate(e.effectiveDate)}
                  </span>
                </div>
                {e.detail && (
                  <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                    {e.detail}
                  </p>
                )}
                {e.createdBy && (
                  <p className="text-muted-foreground/70 mt-1 text-[11px]">
                    — {e.createdBy}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        {deal.events.length === 0 && (
          <p className="text-muted-foreground text-sm">No events recorded yet.</p>
        )}
      </div>
    </div>
  );
}
