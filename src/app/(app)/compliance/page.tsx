import Link from "next/link";
import { Lock, ShieldCheck, LockKeyhole, Unlock } from "lucide-react";

import { getComplianceData } from "@/server/queries/portfolio";
import { fmtDate } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function CompliancePage() {
  const { deals, activity } = await getComplianceData();
  const privileged = deals.filter((d) => d.isPrivileged);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Information Barriers"
        description="Wall-crossings and ethical-wall controls governing access to privileged deals"
      />

      {/* Explainer */}
      <Card className="mb-4 border-[color-mix(in_oklch,var(--info)_25%,transparent)] bg-[color-mix(in_oklch,var(--info)_5%,var(--card))]">
        <CardContent className="flex items-start gap-3 pt-6 text-sm">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[var(--info)]" />
          <div className="space-y-1">
            <p className="font-medium">How the wall works in this POC</p>
            <p className="text-muted-foreground leading-relaxed">
              Deals flagged <span className="font-medium">Privileged</span> are
              visible only to wall-crossed team members and Compliance. Switch the
              role to <span className="font-medium">Read-only</span> via the
              switcher (top-right) — privileged deals disappear from navigation,
              search, and direct links return a restricted screen. Every
              wall-crossing and material action is audit-logged.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Privileged deals & teams */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LockKeyhole className="size-4 text-[var(--warning)]" />
              Privileged Deals & Wall-Crossed Teams
            </CardTitle>
            <CardDescription>
              {privileged.length} deals behind the wall
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {privileged.map((d) => (
              <div key={d.id} className="rounded-lg border border-border/60 p-3.5">
                <div className="mb-2 flex items-center gap-2">
                  <Link
                    href={`/deals/${d.id}`}
                    className="hover:text-primary font-medium transition-colors"
                  >
                    {d.codeName}
                  </Link>
                  <span className="text-muted-foreground text-sm">· {d.borrower}</span>
                  <Badge variant="warning" className="ml-auto gap-1 text-[10px]">
                    <Lock className="size-2.5" />
                    {d.stage}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {d.team.map((m, i) => (
                    <div
                      key={i}
                      className="bg-muted/50 flex items-center gap-1.5 rounded-full py-1 pr-2.5 pl-1"
                    >
                      <span className="bg-primary/15 text-primary flex size-5 items-center justify-center rounded-full text-[9px] font-semibold">
                        {m.name
                          .split(" ")
                          .map((p) => p[0])
                          .join("")
                          .slice(0, 2)}
                      </span>
                      <span className="text-xs font-medium">{m.name}</span>
                      <span className="text-muted-foreground text-[10px]">
                        {m.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {privileged.length === 0 && (
              <p className="text-muted-foreground text-sm">
                No privileged deals currently.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Wall-cross log */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Unlock className="size-4" />
              Wall-Cross Log
            </CardTitle>
            <CardDescription>Audit trail</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activity.map((a) => (
              <div key={a.id} className="flex items-start gap-2.5 text-sm">
                <div className="bg-[color-mix(in_oklch,var(--warning)_18%,transparent)] text-[var(--warning)] mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full">
                  <Lock className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div>
                    <span className="font-medium">{a.actor}</span>{" "}
                    <span className="text-muted-foreground">{a.action}</span>
                  </div>
                  {a.target && (
                    <div className="text-muted-foreground text-xs">{a.target}</div>
                  )}
                  <div className="text-muted-foreground/70 text-[11px]">
                    {fmtDate(a.createdAt)}
                  </div>
                </div>
              </div>
            ))}
            {activity.length === 0 && (
              <p className="text-muted-foreground text-sm">No wall-cross events.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
