"use client";

import * as React from "react";
import { RefreshCw, Database, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useRole } from "@/lib/auth/context";
import { can } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";
import { recordFundamentals, runReconciliation } from "@/server/actions/covenant-ops";

export function SuiteActions({ dealId }: { dealId: string }) {
  const { role } = useRole();
  const [pending, start] = React.useTransition();
  const [busy, setBusy] = React.useState<string | null>(null);

  if (!can(role, "edit", "covenant")) return null;

  /** `fn` may return a message to show instead of the generic success toast. */
  function run(label: string, fn: () => Promise<{ info: string } | { success: string } | void>) {
    setBusy(label);
    start(async () => {
      try {
        const outcome = await fn();
        if (outcome && "info" in outcome) toast.info(outcome.info);
        else toast.success(outcome?.success ?? `${label} complete`);
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
        onClick={() =>
          run("Bloomberg refresh", async () => {
            const r = await recordFundamentals(dealId);
            return r.coverage === "none"
              ? { info: `No Bloomberg coverage for ${r.borrower}: no Bloomberg company ID or LEI on file. Covenants run off compliance-certificate figures.` }
              : { success: `Pulled ${r.fields} fundamental fields via ${r.issuer}` };
          })
        }
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
