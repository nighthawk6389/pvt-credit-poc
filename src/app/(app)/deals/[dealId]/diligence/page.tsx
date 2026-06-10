import { notFound } from "next/navigation";
import { Phone, MapPin, StickyNote } from "lucide-react";

import { getDiligence } from "@/server/queries/deal";
import { fmtDate } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DdqList } from "@/components/deal/ddq-list";

export default async function DiligencePage({
  params,
}: {
  params: Promise<{ dealId: string }>;
}) {
  const { dealId } = await params;
  const deal = await getDiligence(dealId);
  if (!deal) notFound();

  const cleared = deal.ddqItems.filter((d) => d.status === "Cleared").length;
  const flags = deal.ddqItems.filter((d) => d.status === "Flag").length;

  const noteIcon = (kind: string) =>
    kind === "MgmtCall" ? Phone : kind === "SiteVisit" ? MapPin : StickyNote;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card className="mb-4">
          <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-base">Due Diligence Questionnaire</CardTitle>
              <CardDescription>
                {cleared}/{deal.ddqItems.length} items cleared
                {flags > 0 && ` · ${flags} flagged`}
              </CardDescription>
            </div>
            <div className="flex gap-4 text-center">
              <div>
                <div className="text-xl font-semibold tabular-nums text-[var(--success)]">
                  {cleared}
                </div>
                <div className="text-muted-foreground text-[10px]">Cleared</div>
              </div>
              <div>
                <div className="text-xl font-semibold tabular-nums text-[var(--danger)]">
                  {flags}
                </div>
                <div className="text-muted-foreground text-[10px]">Flags</div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <DdqList dealId={dealId} items={deal.ddqItems} />
      </div>

      {/* Notes */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Diligence Notes</CardTitle>
            <CardDescription>Management calls & site visits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {deal.notes.map((n) => {
              const Icon = noteIcon(n.kind);
              return (
                <div key={n.id} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Icon className="text-muted-foreground size-3.5" />
                    <span className="text-sm font-medium">{n.title}</span>
                    <Badge variant="muted" className="ml-auto text-[9px]">
                      {fmtDate(n.createdAt)}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {n.body}
                  </p>
                  <p className="text-muted-foreground/70 text-[11px]">— {n.author}</p>
                </div>
              );
            })}
            {deal.notes.length === 0 && (
              <p className="text-muted-foreground text-sm">No notes yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
