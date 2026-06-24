import type { FactMap, ParsedDefinition } from "./types";
import { evaluate } from "./evaluate";
import { EBITDA_FIELDS } from "./fields";

export interface ScenarioInput {
  ebitdaHaircutPct: number; // 0..100 — reduce EBITDA fields by this %
  rateShockBps: number; // increases interest expense via implied rate
}

export interface ProjectedPoint {
  periodEnd: string;
  periodLabel: string;
  thresholdApplied: number;
  projectedValue: number | null;
  headroomPct: number;
  trips: boolean;
}

/** Apply a scenario shock to a period's facts (pure, immutable). */
export function applyScenario(facts: FactMap, scenario: ScenarioInput): FactMap {
  const next: FactMap = { ...facts };
  const haircut = 1 - scenario.ebitdaHaircutPct / 100;
  for (const f of EBITDA_FIELDS) {
    if (f in next) next[f] = next[f] * haircut;
  }
  // Rate shock: bump interest expense proportionally to implied debt × bps.
  if ("INT_EXP" in next && scenario.rateShockBps !== 0) {
    const debt = next.TOT_DEBT ?? next.NET_DEBT ?? 0;
    next.INT_EXP = next.INT_EXP + (debt * scenario.rateShockBps) / 10_000;
  }
  if ("FIXED_CHARGES" in next && scenario.rateShockBps !== 0) {
    const debt = next.TOT_DEBT ?? next.NET_DEBT ?? 0;
    next.FIXED_CHARGES = next.FIXED_CHARGES + (debt * scenario.rateShockBps) / 10_000;
  }
  return next;
}

/** Project a covenant across periods under a scenario, vs the step-down schedule. */
export function projectCovenant(
  def: ParsedDefinition,
  baseFactsByPeriod: { periodEnd: string; periodLabel: string; facts: FactMap }[],
  scenario: ScenarioInput,
): ProjectedPoint[] {
  return baseFactsByPeriod.map(({ periodEnd, periodLabel, facts }) => {
    const shocked = applyScenario(facts, scenario);
    const r = evaluate(def, shocked, new Date(periodEnd));
    return {
      periodEnd,
      periodLabel,
      thresholdApplied: r.thresholdApplied,
      projectedValue: r.value,
      headroomPct: r.headroomPct,
      trips: r.value !== null && r.springingActive && !r.pass,
    };
  });
}
