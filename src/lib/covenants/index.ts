// Barrel for the pure covenant engine. Import from here in both server and
// client code. NOTHING in src/lib/covenants imports Prisma/server-only/adapters.

export * from "./types";
export * from "./fields";
export * from "./parser";
export * from "./schedule";
export * from "./evaluate";
export * from "./reconcile";
export * from "./status";
export * from "./forecast";
export * from "./json";
export * from "./adjust";
export * from "./aggregate";

import type { CovenantCategory, Operator, ParsedDefinition } from "./types";
import { parseAst, parseFieldRefs, parseSchedule, parseSpringing } from "./json";
import { parse, collectFields } from "./parser";

/** Shape of the persisted CovenantDefinition row fields we need to parse. */
export interface DefinitionRow {
  id?: string;
  name: string;
  category: string;
  formula: string;
  formulaAst: string;
  fieldRefs: string;
  ebitdaBasis: string;
  operator: string;
  unit: string;
  threshold: number;
  thresholdSchedule: string | null;
  springingCondition: string | null;
}

/** Turn a DB definition row into the engine's ParsedDefinition. Resilient:
 *  re-parses the formula if the stored AST is missing/corrupt. */
export function toParsedDefinition(row: DefinitionRow): ParsedDefinition {
  let ast = parseAst(row.formulaAst);
  let fieldRefs = parseFieldRefs(row.fieldRefs);
  if (!ast) {
    // Re-parse from the formula text. If that also fails (corrupt/unknown
    // field), fall back to a safe constant AST so a bad row never 500s a page;
    // evaluation will simply yield a null value for the covenant.
    try {
      ast = parse(row.formula);
      fieldRefs = collectFields(ast);
    } catch {
      ast = { kind: "num", value: NaN };
      fieldRefs = [];
    }
  }
  return {
    id: row.id,
    name: row.name,
    category: row.category as CovenantCategory,
    formula: row.formula,
    ast,
    fieldRefs,
    ebitdaBasis: row.ebitdaBasis,
    operator: row.operator as Operator,
    unit: row.unit,
    threshold: row.threshold,
    thresholdSchedule: parseSchedule(row.thresholdSchedule),
    springingCondition: parseSpringing(row.springingCondition),
  };
}
