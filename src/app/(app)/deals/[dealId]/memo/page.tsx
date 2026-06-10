import { notFound } from "next/navigation";
import { FileText } from "lucide-react";

import { getMemo } from "@/server/queries/deal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MemoEditor } from "@/components/memo/memo-editor";
import { VotePanel } from "@/components/memo/vote-panel";
import { RiskRatingBadge } from "@/components/deal/badges";

type Section = { key: string; title: string; body: string };

export default async function MemoPage({
  params,
}: {
  params: Promise<{ dealId: string }>;
}) {
  const { dealId } = await params;
  const deal = await getMemo(dealId);
  if (!deal || !deal.memo) notFound();

  const sections = JSON.parse(deal.memo.sections) as Section[];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card className="mb-4">
          <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4" />
                Investment Committee Memo
              </CardTitle>
              <CardDescription>{deal.memo.recommendation}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">Proposed rating</span>
              <RiskRatingBadge rating={deal.memo.proposedRating} />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-xs">
              Draft sections below. Use{" "}
              <Badge variant="muted" className="text-[9px]">
                Draft with AI
              </Badge>{" "}
              to generate a first pass grounded in the deal context, then edit and
              save. Every save is audit-logged.
            </p>
          </CardContent>
        </Card>

        <MemoEditor
          dealId={dealId}
          borrower={deal.borrower.name}
          initialSections={sections}
        />
      </div>

      <div>
        <VotePanel
          dealId={dealId}
          memoStatus={deal.memo.status}
          votes={deal.votes}
        />
      </div>
    </div>
  );
}
