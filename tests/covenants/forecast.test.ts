import { describe, it, expect } from "vitest";
import { projectCovenant, type ThresholdStep, type FactMap } from "@/lib/covenants/index";
import { makeDef, atlasFacts, NET_LEVERAGE } from "./helpers";

// Area 5: forecast scenario monotonicity. As the EBITDA haircut increases,
// the number of tripping periods must be (weakly) monotone non-decreasing, and
// a large enough haircut must trip a seeded near-breach leverage covenant.
describe("forecast scenario monotonicity (projectCovenant + evaluate + schedule)", () => {
  // Step-down schedule so the forecast also exercises threshold resolution.
  const schedule: ThresholdStep[] = [
    { effective: "2024-01-01", value: 5.75 },
    { effective: "2025-01-01", value: 5.25 },
    { effective: "2026-01-01", value: 4.75 },
  ];
  const def = makeDef({
    name: "Total Net Leverage (forecast)",
    formula: NET_LEVERAGE,
    operator: "<=",
    threshold: 5.75,
    thresholdSchedule: schedule,
  });

  // Eight quarterly periods. Latest period is engineered as a near-breach:
  // leverage ~4.5x against the 4.75x step → small haircut should trip it.
  const periods: { periodEnd: string; periodLabel: string; facts: FactMap }[] = [
    { periodEnd: "2024-03-31", periodLabel: "Q1 2024", facts: atlasFacts({ TOT_DEBT: 184, CASH: 24 }) }, // 4.0x
    { periodEnd: "2024-06-30", periodLabel: "Q2 2024", facts: atlasFacts({ TOT_DEBT: 188, CASH: 24 }) }, // 4.1x
    { periodEnd: "2024-09-30", periodLabel: "Q3 2024", facts: atlasFacts({ TOT_DEBT: 192, CASH: 24 }) }, // 4.2x
    { periodEnd: "2024-12-31", periodLabel: "Q4 2024", facts: atlasFacts({ TOT_DEBT: 196, CASH: 24 }) }, // 4.3x
    { periodEnd: "2025-03-31", periodLabel: "Q1 2025", facts: atlasFacts({ TOT_DEBT: 200, CASH: 24 }) }, // 4.4x
    { periodEnd: "2025-06-30", periodLabel: "Q2 2025", facts: atlasFacts({ TOT_DEBT: 200, CASH: 24 }) }, // 4.4x
    { periodEnd: "2025-09-30", periodLabel: "Q3 2025", facts: atlasFacts({ TOT_DEBT: 204, CASH: 24 }) }, // 4.5x
    { periodEnd: "2026-03-31", periodLabel: "Q1 2026", facts: atlasFacts({ TOT_DEBT: 204, CASH: 24 }) }, // 4.5x vs 4.75x step → near-breach
  ];

  function tripsAtHaircut(haircutPct: number): number {
    const pts = projectCovenant(def, periods, { ebitdaHaircutPct: haircutPct, rateShockBps: 0 });
    return pts.filter((p) => p.trips).length;
  }

  it("baseline (no haircut) has no tripping periods — all pass their applicable threshold", () => {
    expect(tripsAtHaircut(0)).toBe(0);
  });

  it("tripping-period count is weakly monotone non-decreasing in EBITDA haircut", () => {
    const haircuts = [0, 5, 10, 15, 20, 30, 40, 50];
    const counts = haircuts.map(tripsAtHaircut);
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
    }
  });

  it("a large enough haircut trips the seeded near-breach period, then more periods", () => {
    // The 2026 near-breach period (4.5x vs 4.75x) needs only a small haircut:
    // halving the threshold cushion. A 6% haircut lifts leverage to ~4.79x > 4.75x.
    expect(tripsAtHaircut(6)).toBeGreaterThanOrEqual(1);
    // A severe haircut should trip strictly more periods than a mild one.
    expect(tripsAtHaircut(40)).toBeGreaterThan(tripsAtHaircut(6));
  });

  it("the latest period is the first to trip (tightest threshold + highest leverage)", () => {
    const pts = projectCovenant(def, periods, { ebitdaHaircutPct: 6, rateShockBps: 0 });
    const tripping = pts.filter((p) => p.trips).map((p) => p.periodLabel);
    expect(tripping).toContain("Q1 2026");
  });
});
