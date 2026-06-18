// Typed parse/serialize for the stringified-JSON columns (SQLite has no JSON).
// Every parse is guarded so a malformed row never 500s a page.

import type { Ast, SpringingCondition, ThresholdStep } from "./types";

export function parseAst(s: string | null | undefined): Ast | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as Ast;
  } catch {
    return null;
  }
}

export function parseFieldRefs(s: string | null | undefined): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? (v as string[]) : [];
  } catch {
    return [];
  }
}

export function parseSchedule(s: string | null | undefined): ThresholdStep[] | null {
  if (!s) return null;
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? (v as ThresholdStep[]) : null;
  } catch {
    return null;
  }
}

export function parseSpringing(s: string | null | undefined): SpringingCondition | null {
  if (!s) return null;
  try {
    const v = JSON.parse(s);
    if (v && typeof v === "object" && "field" in v && "op" in v && "value" in v) {
      return v as SpringingCondition;
    }
    return null;
  } catch {
    return null;
  }
}

export interface BasketConfig {
  type: string; // Debt | RP | Investment
  capFormula?: string;
  builderBasis?: string;
  capacity?: number;
}

export function parseBasket(s: string | null | undefined): BasketConfig | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as BasketConfig;
  } catch {
    return null;
  }
}

export interface FormulaSnapshot {
  formula: string;
  inputs: Record<string, number>;
  value: number | null;
  thresholdApplied: number;
}

export function parseSnapshot(s: string | null | undefined): FormulaSnapshot | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as FormulaSnapshot;
  } catch {
    return null;
  }
}

export const toJson = (v: unknown): string => JSON.stringify(v);
