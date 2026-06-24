// Covenant engine — shared types. PURE module: no Prisma, no server-only,
// no adapter imports. Safe to import from client components (scenario slider).

export type Operator = "<=" | ">=";

export type CovenantCategory =
  | "Maintenance"
  | "Springing"
  | "Incurrence"
  | "Reporting";

export type CovenantStatus =
  | "Pass"
  | "Breach"
  | "Waived"
  | "Upcoming"
  | "Near-breach"
  | "Recon-flag"
  | "Late"
  | "Missing"
  | "N/A-springing";

export type Ast =
  | { kind: "num"; value: number }
  | { kind: "field"; code: string }
  | { kind: "bin"; op: "+" | "-" | "*" | "/"; left: Ast; right: Ast }
  | { kind: "neg"; operand: Ast };

export type FactMap = Record<string, number>;

export interface ThresholdStep {
  effective: string; // ISO date the step takes effect
  value: number;
}

export interface SpringingCondition {
  field: string;
  op: ">" | ">=" | "<" | "<=";
  value: number;
}

/** Parsed/normalized covenant definition the engine evaluates. */
export interface ParsedDefinition {
  id?: string;
  name: string;
  category: CovenantCategory;
  formula: string;
  ast: Ast;
  fieldRefs: string[];
  ebitdaBasis: string;
  operator: Operator;
  unit: string; // "x" | "$MM" | "%"
  threshold: number;
  thresholdSchedule: ThresholdStep[] | null;
  springingCondition: SpringingCondition | null;
}

export interface EvalResult {
  value: number | null;
  thresholdApplied: number;
  operator: Operator;
  pass: boolean;
  headroomPct: number; // signed; positive = cushion
  breakevenEbitda: number | null;
  inputs: FactMap; // resolved field values used
  missing: string[]; // field codes with no fact
  springingActive: boolean; // false ⇒ test is N/A this period
}
