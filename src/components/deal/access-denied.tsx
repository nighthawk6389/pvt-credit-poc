import Link from "next/link";
import { LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";

export function AccessDenied({
  reason = "This deal is privileged. Your current role is outside the information barrier and cannot view it.",
}: {
  reason?: string;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
      <div className="bg-[color-mix(in_oklch,var(--warning)_15%,transparent)] flex size-14 items-center justify-center rounded-full text-[var(--warning)]">
        <LockKeyhole className="size-7" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold">Restricted — behind the wall</h2>
        <p className="text-muted-foreground text-sm">{reason}</p>
        <p className="text-muted-foreground text-xs">
          Switch to a wall-crossed role (Deal Lead, Analyst, IC Member, or
          Compliance) using the role switcher to view it.
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
