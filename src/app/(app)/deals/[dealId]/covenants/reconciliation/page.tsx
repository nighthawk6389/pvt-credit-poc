import { notFound } from "next/navigation";
import { Scale } from "lucide-react";

import { getActiveRole } from "@/lib/auth/server";
import { getCovenantSuite } from "@/server/queries/covenants";
import { AccessDenied } from "@/components/deal/access-denied";
import { ReconciliationTable } from "@/components/covenants/reconciliation-table";
import { Card, CardContent } from "@/components/ui/card";

export default async function ReconciliationPage({
  params,
}: {
  params: Promise<{ dealId: string }>;
}) {
  const { dealId } = await params;
  const role = await getActiveRole();
  const suite = await getCovenantSuite(dealId, role);
  if (suite.blocked) return <AccessDenied />;
  if (!suite.deal) notFound();

  const financial = suite.items.filter((i) => i.category !== "Reporting");

  return (
    <div className="space-y-4">
      <Card className="border-[color-mix(in_oklch,var(--info)_25%,transparent)] bg-[color-mix(in_oklch,var(--info)_5%,var(--card))]">
        <CardContent className="flex items-start gap-3 pt-6 text-sm">
          <Scale className="mt-0.5 size-5 shrink-0 text-[var(--info)]" />
          <div>
            <p className="font-medium">Independent recomputation vs. borrower-reported</p>
            <p className="text-muted-foreground leading-relaxed">
              Each covenant is recomputed by the engine from Bloomberg fundamental
              fields and compared to the figure on the borrower&apos;s compliance
              certificate. Breach is judged on the recomputed value; discrepancies
              beyond tolerance are flagged separately. Expand any row to trace the
              math back to source fields.
            </p>
          </div>
        </CardContent>
      </Card>

      {financial.map((item) => (
        <ReconciliationTable key={item.id} dealId={dealId} item={item} />
      ))}
    </div>
  );
}
