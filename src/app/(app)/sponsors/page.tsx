import Link from "next/link";
import { Handshake, MapPin, User } from "lucide-react";

import { getActiveRole } from "@/lib/auth/server";
import { getSponsors } from "@/server/queries/portfolio";
import { fmtMM } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StageBadge } from "@/components/deal/badges";

export default async function SponsorsPage() {
  const role = await getActiveRole();
  const sponsors = await getSponsors(role);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Sponsor Coverage"
        description="Relationship CRM across financial-sponsor partners driving deal flow"
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {sponsors.map((s) => (
          <Card key={s.id}>
            <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
              <div className="flex items-start gap-3">
                <div className="bg-primary/15 text-primary flex size-10 items-center justify-center rounded-lg">
                  <Handshake className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base">{s.name}</CardTitle>
                  <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                    <span>{s.type}</span>
                    {s.aum && <span>{fmtMM(s.aum, 0)} AUM</span>}
                    {s.hqCity && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3" />
                        {s.hqCity}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold tabular-nums">
                  {fmtMM(s.committed, 0)}
                </div>
                <div className="text-muted-foreground text-xs">committed</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Deals:</span>
                  <span className="font-medium">{s.dealCount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Closed:</span>
                  <span className="font-medium">{s.closedCount}</span>
                </div>
                {s.owner && (
                  <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="size-3.5" />
                    {s.owner}
                  </div>
                )}
              </div>
              <div className="space-y-1.5 border-t border-border/50 pt-2">
                {s.deals.map((d) => (
                  <Link
                    key={d.id}
                    href={`/deals/${d.id}`}
                    className="hover:bg-muted/40 -mx-2 flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors"
                  >
                    <span className="font-medium">{d.codeName}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {d.borrower}
                    </span>
                    <span className="ml-auto flex items-center gap-2">
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {fmtMM(d.size, 0)}
                      </span>
                      <StageBadge stage={d.stage} />
                    </span>
                  </Link>
                ))}
                {s.deals.length === 0 && (
                  <p className="text-muted-foreground text-xs">
                    No visible deals at your access level.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
