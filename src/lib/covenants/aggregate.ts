// Period-basis handling: covenants test on a defined basis (usually LTM) even
// when fundamentals are quoted quarterly or calendar-YTD. Flow fields (P&L /
// cash-flow) must be SUMMED over the trailing four quarters; stock fields
// (balance-sheet point-in-time) take the latest quarter; ratios/derived are
// recomputed downstream. This module builds an LTM fact map from quarters.
// Pure module — no Prisma/server imports.

import type { FactMap } from "./types";
import { FIELD_LIBRARY } from "./fields";

export type Aggregation = "flow" | "stock" | "derived";

/** How a field aggregates across periods to form an LTM figure. */
export function fieldAggregation(code: string): Aggregation {
  const def = FIELD_LIBRARY[code];
  if (!def) return "stock";
  if (def.category === "Derived") return "derived";
  // P&L and cash-flow items accrue over the period → sum to LTM.
  if (def.category === "PnL" || def.category === "CashFlow") return "flow";
  // Balance-sheet items (incl. % utilization) are point-in-time → latest.
  return "stock";
}

export interface QuarterFacts {
  periodEnd: string; // ISO
  facts: FactMap;
}

/**
 * Build a single LTM fact map for the most recent quarter from up to four
 * trailing quarters. Flow fields are summed across the available quarters
 * (annualized if fewer than four are present); stock fields take the latest.
 */
export function assembleLtm(quarters: QuarterFacts[]): FactMap {
  if (quarters.length === 0) return {};
  const sorted = [...quarters].sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));
  const window = sorted.slice(-4);
  const latest = window[window.length - 1].facts;

  const codes = new Set<string>();
  for (const q of window) for (const c of Object.keys(q.facts)) codes.add(c);

  const out: FactMap = {};
  for (const code of codes) {
    const agg = fieldAggregation(code);
    if (agg === "derived") continue; // recomputed by the engine
    if (agg === "stock") {
      if (latest[code] !== undefined) out[code] = latest[code];
      continue;
    }
    // flow: sum across the window, annualizing a short window (<4 quarters)
    const present = window.filter((q) => q.facts[code] !== undefined);
    if (present.length === 0) continue;
    const sum = present.reduce((s, q) => s + q.facts[code], 0);
    out[code] = present.length < 4 ? +((sum / present.length) * 4).toFixed(4) : +sum.toFixed(4);
  }
  return out;
}

/** Build an LTM fact map per quarter-end (each keyed to its trailing four). */
export function assembleLtmSeries(
  quarters: QuarterFacts[],
): { periodEnd: string; facts: FactMap }[] {
  const sorted = [...quarters].sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));
  return sorted.map((_, i) => ({
    periodEnd: sorted[i].periodEnd,
    facts: assembleLtm(sorted.slice(0, i + 1)),
  }));
}
