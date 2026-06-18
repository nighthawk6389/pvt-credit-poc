import { notFound } from "next/navigation";

import { getActiveRole } from "@/lib/auth/server";
import { getCovenantSuite } from "@/server/queries/covenants";
import { AccessDenied } from "@/components/deal/access-denied";
import { FormulaBuilder } from "@/components/covenants/formula-builder";

export default async function DefinitionsPage({
  params,
}: {
  params: Promise<{ dealId: string }>;
}) {
  const { dealId } = await params;
  const role = await getActiveRole();
  const suite = await getCovenantSuite(dealId, role);
  if (suite.blocked) return <AccessDenied />;
  if (!suite.deal) notFound();

  const definitions = suite.items
    .filter((i) => i.category !== "Reporting")
    .map((i) => ({
      id: i.id,
      name: i.name,
      category: i.category,
      formula: i.formula,
      operator: i.operator,
      unit: i.unit,
      threshold: i.threshold,
      source: i.source,
    }));

  return <FormulaBuilder dealId={dealId} definitions={definitions} />;
}
