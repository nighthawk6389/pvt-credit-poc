// Test-only helpers. Build a ParsedDefinition the way toParsedDefinition would
// (via the persisted-row path), so tests exercise parse + collectFields + the
// JSON-column decoders the same way production code does. No app source changed.

import {
  toParsedDefinition,
  toJson,
  parse,
  collectFields,
  type DefinitionRow,
  type ParsedDefinition,
  type ThresholdStep,
  type SpringingCondition,
  type Operator,
  type CovenantCategory,
} from "@/lib/covenants/index";

export interface DefSpec {
  name: string;
  category?: CovenantCategory;
  formula: string;
  operator: Operator;
  unit?: string;
  threshold: number;
  ebitdaBasis?: string;
  thresholdSchedule?: ThresholdStep[] | null;
  springingCondition?: SpringingCondition | null;
}

/**
 * Round-trips a definition spec through the persisted-row encoders and
 * toParsedDefinition — i.e. it mirrors how a CovenantDefinition row produced by
 * the formula builder becomes the engine's ParsedDefinition.
 */
export function makeDef(spec: DefSpec): ParsedDefinition {
  const ast = parse(spec.formula);
  const fieldRefs = collectFields(ast);
  const row: DefinitionRow = {
    name: spec.name,
    category: spec.category ?? "Maintenance",
    formula: spec.formula,
    formulaAst: toJson(ast),
    fieldRefs: toJson(fieldRefs),
    ebitdaBasis: spec.ebitdaBasis ?? "EBITDA_ADJ",
    operator: spec.operator,
    unit: spec.unit ?? "x",
    threshold: spec.threshold,
    thresholdSchedule: spec.thresholdSchedule
      ? toJson(spec.thresholdSchedule)
      : null,
    springingCondition: spec.springingCondition
      ? toJson(spec.springingCondition)
      : null,
  };
  return toParsedDefinition(row);
}

/** A realistic Atlas-scale leverage fact set: EBITDA ~40, leverage ~4.4x. */
export function atlasFacts(over: Record<string, number> = {}): Record<string, number> {
  return {
    EBITDA: 40,
    EBITDA_ADJ: 40,
    TOT_DEBT: 200,
    CASH: 24,
    SR_DEBT: 156,
    INT_EXP: 18,
    CAPEX: 3.2,
    SCHED_AMORT: 2,
    FIXED_CHARGES: 22.4,
    RCF_AVAILABLE: 20,
    SALES_REV_TURN: 210,
    ...over,
  };
}

export const NET_LEVERAGE = "(TOT_DEBT - CASH) / EBITDA_ADJ";
export const INTEREST_COVERAGE = "EBITDA_ADJ / INT_EXP";
export const MIN_LIQUIDITY = "CASH + RCF_AVAILABLE";
