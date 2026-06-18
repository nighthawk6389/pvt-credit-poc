import type {
  Ast,
  EvalResult,
  FactMap,
  Operator,
  ParsedDefinition,
  SpringingCondition,
} from "./types";
import { FIELD_LIBRARY } from "./fields";
import { parse } from "./parser";
import { resolveThreshold } from "./schedule";

/** Evaluate an AST against a fact map, resolving derived fields recursively. */
export function evalAst(ast: Ast, facts: FactMap, seen: Set<string> = new Set()): number {
  switch (ast.kind) {
    case "num":
      return ast.value;
    case "neg":
      return -evalAst(ast.operand, facts, seen);
    case "bin": {
      const l = evalAst(ast.left, facts, seen);
      const r = evalAst(ast.right, facts, seen);
      switch (ast.op) {
        case "+":
          return l + r;
        case "-":
          return l - r;
        case "*":
          return l * r;
        case "/":
          return r === 0 ? NaN : l / r;
      }
      return NaN;
    }
    case "field": {
      const code = ast.code;
      if (code in facts) return facts[code];
      // derived field?
      const def = FIELD_LIBRARY[code];
      if (def?.derive) {
        if (seen.has(code)) throw new Error(`Circular derived field: ${code}`);
        seen.add(code);
        return evalAst(parse(def.derive), facts, seen);
      }
      return NaN; // missing
    }
  }
}

function collectMissing(ast: Ast, facts: FactMap): string[] {
  const missing = new Set<string>();
  const walk = (n: Ast) => {
    if (n.kind === "field") {
      if (!(n.code in facts)) {
        const d = FIELD_LIBRARY[n.code];
        if (d?.derive) walk(parse(d.derive));
        else missing.add(n.code);
      }
    } else if (n.kind === "bin") {
      walk(n.left);
      walk(n.right);
    } else if (n.kind === "neg") walk(n.operand);
  };
  walk(ast);
  return [...missing];
}

export function headroom(value: number, threshold: number, operator: Operator): number {
  if (threshold === 0) return 0;
  // For "<=" covenants, cushion grows as value falls below threshold.
  // For ">=" covenants, cushion grows as value rises above threshold.
  return operator === "<="
    ? ((threshold - value) / threshold) * 100
    : ((value - threshold) / threshold) * 100;
}

export function passes(value: number, threshold: number, operator: Operator): boolean {
  return operator === "<=" ? value <= threshold + 1e-9 : value >= threshold - 1e-9;
}

export function springingActive(
  cond: SpringingCondition | null,
  facts: FactMap,
): boolean {
  if (!cond) return true; // not springing ⇒ always tested
  const v = facts[cond.field];
  if (v === undefined) return false;
  switch (cond.op) {
    case ">":
      return v > cond.value;
    case ">=":
      return v >= cond.value;
    case "<":
      return v < cond.value;
    case "<=":
      return v <= cond.value;
  }
}

/**
 * Numeric break-even: the value of the EBITDA field at which headroom = 0,
 * holding all other inputs fixed. Ratios here are monotonic in EBITDA, so a
 * bounded bisection is robust and formula-agnostic. Returns null if not solvable.
 */
export function solveBreakeven(
  ast: Ast,
  facts: FactMap,
  ebitdaField: string,
  threshold: number,
  operator: Operator,
): number | null {
  const base = facts[ebitdaField];
  if (base === undefined || !Number.isFinite(base) || base <= 0) return null;

  const f = (e: number) => {
    const next = { ...facts, [ebitdaField]: e };
    return evalAst(ast, next) - threshold;
  };

  let lo = base * 0.05;
  let hi = base * 5;
  let flo = f(lo);
  let fhi = f(hi);
  if (!Number.isFinite(flo) || !Number.isFinite(fhi)) return null;
  if (flo === 0) return lo;
  if (fhi === 0) return hi;
  if (flo * fhi > 0) return null; // no sign change in bracket

  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const fmid = f(mid);
    if (Math.abs(fmid) < 1e-7) return mid;
    if (flo * fmid < 0) {
      hi = mid;
      fhi = fmid;
    } else {
      lo = mid;
      flo = fmid;
    }
  }
  void operator;
  return (lo + hi) / 2;
}

export function evaluate(
  def: ParsedDefinition,
  facts: FactMap,
  asOfDate: Date,
): EvalResult {
  const thresholdApplied = resolveThreshold(def.thresholdSchedule, asOfDate, def.threshold);
  const active = springingActive(def.springingCondition, facts);
  const missing = collectMissing(def.ast, facts);
  const raw = evalAst(def.ast, facts);
  const value = Number.isFinite(raw) ? raw : null;

  const inputs: FactMap = {};
  for (const code of def.fieldRefs) {
    if (code in facts) inputs[code] = facts[code];
  }

  if (value === null) {
    return {
      value: null,
      thresholdApplied,
      operator: def.operator,
      pass: false,
      headroomPct: 0,
      breakevenEbitda: null,
      inputs,
      missing,
      springingActive: active,
    };
  }

  const pass = passes(value, thresholdApplied, def.operator);
  const hr = headroom(value, thresholdApplied, def.operator);
  const ebitdaField = def.ebitdaBasis in facts ? def.ebitdaBasis : "EBITDA_ADJ";
  const breakevenEbitda = solveBreakeven(
    def.ast,
    facts,
    ebitdaField,
    thresholdApplied,
    def.operator,
  );

  return {
    value,
    thresholdApplied,
    operator: def.operator,
    pass,
    headroomPct: +hr.toFixed(2),
    breakevenEbitda: breakevenEbitda != null ? +breakevenEbitda.toFixed(1) : null,
    inputs,
    missing,
    springingActive: active,
  };
}
