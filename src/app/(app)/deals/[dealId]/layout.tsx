import { notFound } from "next/navigation";
import { LockKeyhole, Building2 } from "lucide-react";

import { getActiveRole } from "@/lib/auth/server";
import { getDealHeader } from "@/server/queries/deal";
import { fmtMM, fmtSpread } from "@/lib/utils";
import { DealTabs } from "@/components/deal/deal-tabs";
import { AccessDenied } from "@/components/deal/access-denied";
import { StageBadge, StatusBadge } from "@/components/deal/badges";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default async function DealLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ dealId: string }>;
}) {
  const { dealId } = await params;
  const role = await getActiveRole();
  const { deal, blocked } = await getDealHeader(dealId, role);

  if (blocked) return <AccessDenied />;
  if (!deal) notFound();

  const lead = deal.facilities[0];

  return (
    <div className="mx-auto max-w-7xl">
      {/* Deal header */}
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">
              {deal.codeName}
            </h1>
            <StageBadge stage={deal.stage} />
            <StatusBadge status={deal.status} />
            {deal.isPrivileged && (
              <Badge variant="warning" className="gap-1">
                <LockKeyhole className="size-3" />
                Privileged
              </Badge>
            )}
          </div>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="text-foreground inline-flex items-center gap-1.5 font-medium">
              <Building2 className="size-3.5" />
              {deal.borrower.name}
            </span>
            <span>·</span>
            <span>{deal.borrower.sector}</span>
            {deal.sponsor && (
              <>
                <span>·</span>
                <span>{deal.sponsor.name}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-5">
          <Stat label="Facility" value={deal.facilityType} />
          <Stat label="Size" value={fmtMM(deal.dealSize, 0)} />
          {lead && <Stat label="Pricing" value={fmtSpread(lead.spreadBps)} />}
          <div className="space-y-1">
            <div className="text-muted-foreground text-xs">Deal team</div>
            <div className="flex -space-x-2">
              {deal.team.map((m) => (
                <Tooltip key={m.id}>
                  <TooltipTrigger asChild>
                    <Avatar className="ring-background size-7 ring-2">
                      <AvatarFallback className="bg-primary/15 text-primary text-[10px] font-semibold">
                        {m.name
                          .split(" ")
                          .map((p) => p[0])
                          .join("")
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>
                    {m.name} · {m.role}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        </div>
      </div>

      <DealTabs dealId={dealId} />
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}
