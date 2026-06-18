"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { bloomberg } from "@/lib/bloomberg/client";
import { copilot } from "@/lib/copilot/service";
import {
  parse,
  collectFields,
  toParsedDefinition,
  evaluate,
  reconcile,
  deriveCovenantStatus,
  toJson,
  validateFormula,
  type ThresholdStep,
  type SpringingCondition,
} from "@/lib/covenants";
import { guard, logActivity } from "./helpers";

function bust(dealId: string) {
  revalidatePath(`/deals/${dealId}/covenants`);
  revalidatePath(`/deals/${dealId}/covenants/definitions`);
  revalidatePath(`/deals/${dealId}/covenants/reconciliation`);
  revalidatePath(`/deals/${dealId}/covenants/fundamentals`);
  revalidatePath(`/deals/${dealId}/covenants/forecast`);
  revalidatePath(`/deals/${dealId}/covenants/pack`);
  revalidatePath(`/covenants`);
}

export interface DefinitionInput {
  id?: string;
  name: string;
  category: string;
  formula: string;
  operator: string;
  unit: string;
  threshold: number;
  ebitdaBasis?: string;
  thresholdSchedule?: ThresholdStep[] | null;
  springingCondition?: SpringingCondition | null;
  source?: string | null;
}

export async function upsertCovenantDefinition(dealId: string, input: DefinitionInput) {
  const { actor, role } = await guard("edit", "covenant");

  // Validate the formula before persisting (the security + correctness gate).
  const check = validateFormula(input.formula);
  if (!check.ok) throw new Error(`Invalid formula: ${check.error}`);
  const ast = parse(input.formula);

  const data = {
    dealId,
    name: input.name,
    category: input.category,
    formula: input.formula,
    formulaAst: toJson(ast),
    fieldRefs: toJson(collectFields(ast)),
    ebitdaBasis: input.ebitdaBasis ?? "EBITDA_ADJ",
    operator: input.operator,
    unit: input.unit,
    threshold: input.threshold,
    thresholdSchedule: input.thresholdSchedule ? toJson(input.thresholdSchedule) : null,
    springingCondition: input.springingCondition ? toJson(input.springingCondition) : null,
    source: input.source ?? null,
  };

  let id = input.id;
  if (id) {
    await db.covenantDefinition.update({ where: { id }, data });
    await logActivity(dealId, actor, role, "edited a covenant definition", input.name);
  } else {
    const created = await db.covenantDefinition.create({ data });
    id = created.id;
    await logActivity(dealId, actor, role, "added a covenant definition", input.name);
  }

  await runReconciliationInternal(dealId, id);
  bust(dealId);
  return { id };
}

export async function deleteCovenantDefinition(dealId: string, definitionId: string) {
  const { actor, role } = await guard("edit", "covenant");
  const def = await db.covenantDefinition.findUnique({ where: { id: definitionId } });
  await db.covenantDefinition.delete({ where: { id: definitionId } });
  await logActivity(dealId, actor, role, "removed a covenant definition", def?.name);
  bust(dealId);
}

/** Pull fundamentals from Bloomberg (anchored to reported financials) and
 *  persist them as FundamentalFacts for every actual period. */
export async function recordFundamentals(dealId: string, borrowerId: string) {
  const { actor, role } = await guard("edit", "covenant");
  const fins = await db.financialStatement.findMany({
    where: { borrowerId, isActual: true },
    orderBy: { periodEnd: "asc" },
  });
  let count = 0;
  for (const fin of fins) {
    const set = await bloomberg.getFundamentals({
      borrower: dealId,
      periodEnd: fin.periodEnd.toISOString(),
      anchor: {
        ebitda: fin.ebitda,
        netLeverage: fin.netLeverage,
        interestCoverage: fin.interestCoverage,
        liquidity: fin.liquidity,
        capex: fin.capex,
        revenue: fin.revenue,
      },
    });
    for (const [fieldCode, value] of Object.entries(set.fields)) {
      const existing = await db.fundamentalFact.findFirst({
        where: { borrowerId, periodEnd: fin.periodEnd, fieldCode, source: "BBG" },
      });
      if (existing) {
        await db.fundamentalFact.update({ where: { id: existing.id }, data: { value } });
      } else {
        await db.fundamentalFact.create({
          data: { borrowerId, periodEnd: fin.periodEnd, fieldCode, value, source: "BBG" },
        });
      }
      count++;
    }
  }
  await logActivity(dealId, actor, role, `refreshed ${count} Bloomberg fundamental fields`, "FA");
  bust(dealId);
}

export async function overrideFundamental(
  dealId: string,
  borrowerId: string,
  periodEnd: string,
  fieldCode: string,
  value: number,
  note: string,
) {
  const { actor, role } = await guard("edit", "covenant");
  const pe = new Date(periodEnd);
  const existing = await db.fundamentalFact.findFirst({
    where: { borrowerId, periodEnd: pe, fieldCode, isOverride: true },
  });
  if (existing) {
    await db.fundamentalFact.update({ where: { id: existing.id }, data: { value, note } });
  } else {
    await db.fundamentalFact.create({
      data: { borrowerId, periodEnd: pe, fieldCode, value, source: "Override", isOverride: true, note },
    });
  }
  await logActivity(dealId, actor, role, `overrode ${fieldCode}`, note);
  bust(dealId);
}

/** Recompute every definition's tests from current fundamentals and persist. */
async function runReconciliationInternal(dealId: string, onlyDefId?: string) {
  const defs = await db.covenantDefinition.findMany({
    where: onlyDefId ? { id: onlyDefId } : { dealId },
    include: {
      tests: true,
      deal: { include: { borrower: true } },
      reportingObligation: { include: { deliveries: true } },
    },
  });
  for (const def of defs) {
    if (def.category === "Reporting") continue;
    const parsed = toParsedDefinition(def);
    const facts = await db.fundamentalFact.findMany({
      where: { borrowerId: def.deal.borrower.id },
      orderBy: [{ periodEnd: "asc" }, { isOverride: "asc" }],
    });
    const byPeriod = new Map<string, Record<string, number>>();
    for (const f of facts) {
      const k = f.periodEnd.toISOString();
      const m = byPeriod.get(k) ?? {};
      m[f.fieldCode] = f.value;
      byPeriod.set(k, m);
    }
    for (const t of def.tests) {
      if (t.status === "Upcoming" || t.status === "Waived") continue;
      const fm = byPeriod.get(t.periodEnd.toISOString()) ?? {};
      const res = evaluate(parsed, fm, t.periodEnd);
      const recon =
        res.value != null && t.reportedValue != null ? reconcile(res.value, t.reportedValue) : null;
      const status = deriveCovenantStatus({
        category: parsed.category,
        springingActive: res.springingActive,
        recomputed: res.value,
        thresholdApplied: res.thresholdApplied,
        operator: parsed.operator,
        headroomPct: res.headroomPct,
        reconFlag: recon?.flag ?? false,
        hasActual: res.value != null,
      });
      await db.covenantDefTest.update({
        where: { id: t.id },
        data: {
          recomputedValue: res.value,
          reconDelta: recon?.delta ?? null,
          thresholdApplied: res.thresholdApplied,
          headroomPct: res.headroomPct,
          status,
          formulaSnapshot: toJson({
            formula: parsed.formula, inputs: res.inputs, value: res.value, thresholdApplied: res.thresholdApplied,
          }),
        },
      });
    }
  }
}

export async function runReconciliation(dealId: string) {
  const { actor, role } = await guard("edit", "covenant");
  await runReconciliationInternal(dealId);
  await logActivity(dealId, actor, role, "ran covenant reconciliation", "all covenants");
  bust(dealId);
}

export async function waiveDefTest(dealId: string, testId: string) {
  const { actor, role } = await guard("edit", "covenant");
  await db.covenantDefTest.update({ where: { id: testId }, data: { status: "Waived" } });
  await logActivity(dealId, actor, role, "waived a covenant test");
  bust(dealId);
}

export async function upsertEbitdaAdjustment(
  dealId: string,
  borrowerId: string,
  periodEnd: string,
  input: { id?: string; label: string; amount: number; category: string; capped: boolean; aggressiveFlag: boolean; uncapped: boolean },
) {
  const { actor, role } = await guard("edit", "covenant");
  if (input.id) {
    await db.ebitdaAdjustment.update({ where: { id: input.id }, data: { ...input } });
  } else {
    await db.ebitdaAdjustment.create({
      data: { borrowerId, periodEnd: new Date(periodEnd), order: 99, ...input },
    });
  }
  await logActivity(dealId, actor, role, "updated the EBITDA add-back bridge", input.label);
  bust(dealId);
}

export async function logReportingDelivery(dealId: string, deliveryId: string, delivered: boolean) {
  const { actor, role } = await guard("edit", "covenant");
  const delivery = await db.reportingDelivery.findUnique({ where: { id: deliveryId } });
  if (!delivery) throw new Error("Delivery not found");
  const now = new Date();
  const status = delivered ? (now > delivery.dueDate ? "Late" : "Delivered") : "Missing";
  await db.reportingDelivery.update({
    where: { id: deliveryId },
    data: { deliveredDate: delivered ? now : null, status },
  });
  await logActivity(dealId, actor, role, `marked a filing ${status.toLowerCase()}`);
  bust(dealId);
}

/** Mocked AI extraction — returns structured drafts for analyst review. */
export async function runCovenantExtraction(
  dealId: string,
  task: "extract_covenant_terms" | "extract_cert_figures",
) {
  await guard("edit", "covenant");
  const result = await copilot.run({ task, dealId });
  return result.structured ?? null;
}
