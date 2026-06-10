"use client";

import * as React from "react";
import { ThumbsUp, ThumbsDown, MinusCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { useRole } from "@/lib/auth/context";
import { can, ROLE_META } from "@/lib/auth/roles";
import { voteVariant, statusVariant } from "@/lib/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { castVote, setMemoStatus } from "@/server/actions/memo";

type Vote = { id: string; voter: string; vote: string; comment: string | null };

const OPTIONS = [
  { vote: "Approve", icon: ThumbsUp, variant: "default" as const },
  { vote: "Conditional", icon: AlertCircle, variant: "outline" as const },
  { vote: "Abstain", icon: MinusCircle, variant: "outline" as const },
  { vote: "Reject", icon: ThumbsDown, variant: "outline" as const },
];

export function VotePanel({
  dealId,
  memoStatus,
  votes,
}: {
  dealId: string;
  memoStatus: string;
  votes: Vote[];
}) {
  const { role } = useRole();
  const me = ROLE_META[role].person;
  const canVote = can(role, "vote", "vote");
  const canApprove = can(role, "approve", "memo");
  const [comment, setComment] = React.useState("");
  const [pending, start] = React.useTransition();

  const approve = votes.filter((v) => v.vote === "Approve").length;
  const total = votes.length || 1;
  const myVote = votes.find((v) => v.voter === me);

  function vote(v: string) {
    start(async () => {
      try {
        await castVote(dealId, v, comment);
        setComment("");
        toast.success(`Voted ${v}`);
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  function decide(status: string) {
    start(async () => {
      try {
        await setMemoStatus(dealId, status);
        toast.success(`Memo ${status}`);
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border/70 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Investment Committee</h3>
          <Badge variant={statusVariant(memoStatus)}>{memoStatus}</Badge>
        </div>

        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Approvals</span>
          <span className="font-medium tabular-nums">
            {approve}/{votes.length}
          </span>
        </div>
        <Progress
          value={(approve / total) * 100}
          indicatorClassName="bg-[var(--success)]"
        />

        <div className="mt-4 space-y-2">
          {votes.map((v) => (
            <div key={v.id} className="flex items-start gap-2 text-sm">
              <div className="bg-muted text-muted-foreground mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold">
                {v.voter
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{v.voter}</span>
                  <Badge variant={voteVariant(v.vote)} className="text-[9px]">
                    {v.vote}
                  </Badge>
                </div>
                {v.comment && (
                  <p className="text-muted-foreground text-xs">{v.comment}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cast vote */}
      {canVote && (
        <div className="bg-card rounded-xl border border-border/70 p-4">
          <h3 className="mb-1 text-sm font-semibold">
            Cast your vote{myVote ? " (update)" : ""}
          </h3>
          <p className="text-muted-foreground mb-3 text-xs">Voting as {me}</p>
          <Input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional comment…"
            className="mb-2"
          />
          <div className="grid grid-cols-2 gap-2">
            {OPTIONS.map((o) => (
              <Button
                key={o.vote}
                variant={o.variant}
                size="sm"
                disabled={pending}
                onClick={() => vote(o.vote)}
              >
                <o.icon className="size-4" />
                {o.vote}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Final decision */}
      {canApprove && (
        <div className="bg-card rounded-xl border border-border/70 p-4">
          <h3 className="mb-3 text-sm font-semibold">Final decision</h3>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              disabled={pending}
              onClick={() => decide("Approved")}
            >
              Approve memo
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              disabled={pending}
              onClick={() => decide("Rejected")}
            >
              Reject
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
