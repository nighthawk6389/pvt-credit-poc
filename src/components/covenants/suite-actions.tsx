"use client";

import * as React from "react";
import { RefreshCw, Database, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useRole } from "@/lib/auth/context";
import { can } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";
import { recordFundamentals, runReconciliation } from "@/server/actions/covenant-ops";

export function SuiteActions({ dealId, borrowerId }: { dealId: string; borrowerId: string }) {
  const { role } = useRole();
  const [pending, start] = React.useTransition();
  const [busy, setBusy] = React.useState<string | null>(null);

  if (!can(role, "edit", "covenant")) return null;

  function run(label: string, fn: () => Promise<unknown>) {
    setBusy(label);
    start(async () => {
      try {
        await fn();
        toast.success(`${label} complete`);
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setBusy(null);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => run("Bloomberg refresh", () => recordFundamentals(dealId, borrowerId))}
      >
        {busy === "Bloomberg refresh" ? <Loader2 className="size-4 animate-spin" /> : <Database className="size-4" />}
        Pull FA fundamentals
      </Button>
      <Button
        size="sm"
        disabled={pending}
        onClick={() => run("Reconciliation", () => runReconciliation(dealId))}
      >
        {busy === "Reconciliation" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        Run reconciliation
      </Button>
    </div>
  );
}
