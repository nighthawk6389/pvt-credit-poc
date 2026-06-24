import { describe, it, expect } from "vitest";
import { evaluate, type ThresholdStep } from "@/lib/covenants/index";
import { makeDef, atlasFacts, NET_LEVERAGE } from "./helpers";

// Area 2: step-down schedule resolved INSIDE evaluate (schedule + evaluate +
// headroom/pass together), checking boundary period-ends around step dates.
describe("step-down schedule resolved through evaluate", () => {
  // A typical TLB step-down: 5.75x → 5.25x → 4.75x.
  const schedule: ThresholdStep[] = [
    { effective: "2024-01-01", value: 5.75 },
    { effective: "2025-01-01", value: 5.25 },
    { effective: "2026-01-01", value: 4.75 },
  ];
  const def = makeDef({
    name: "Total Net Leverage (step-down)",
    formula: NET_LEVERAGE,
    operator: "<=",
    threshold: 5.75,
    thresholdSchedule: schedule,
  });

  // Constant leverage = 5.0x across all periods isolates the threshold movement.
  // (TOT_DEBT - CASH) = 5.0 * 40 = 200 → TOT_DEBT 224, CASH 24.
  const facts = atlasFacts({ TOT_DEBT: 224, CASH: 24 });

  it("resolves the opening level for a period-end before the second step", () => {
    const r = evaluate(def, facts, new Date("2024-12-31"));
    expect(r.thresholdApplied).toBe(5.75);
    expect(r.value).toBeCloseTo(5.0, 6);
    expect(r.pass).toBe(true);
  });

  it("boundary: a step effective ON the period-end date applies that period", () => {
    // 2025-01-01 step takes effect on/after its date; periodEnd == effective.
    const r = evaluate(def, facts, new Date("2025-01-01"));
    expect(r.thresholdApplied).toBe(5.25);
    expect(r.pass).toBe(true); // 5.0x <= 5.25x
  });

  it("flips pass→fail across the final step-down with constant leverage", () => {
    // 5.0x still passes 5.25x in 2025...
    const before = evaluate(def, facts, new Date("2025-12-31"));
    expect(before.thresholdApplied).toBe(5.25);
    expect(before.pass).toBe(true);

    // ...but the same 5.0x leverage BREACHES the tightened 4.75x in 2026.
    const after = evaluate(def, facts, new Date("2026-03-31"));
    expect(after.thresholdApplied).toBe(4.75);
    expect(after.pass).toBe(false);
    // headroom flips sign as the covenant tightens past the actual ratio.
    expect(before.headroomPct).toBeGreaterThan(0);
    expect(after.headroomPct).toBeLessThan(0);
  });
});

// Area 3: springing covenant — N/A when trigger below condition, live otherwise.
describe("springing covenant gating through evaluate", () => {
  // Springs only when revolver utilization > 35%; tested as net leverage <= 4.5x.
  const def = makeDef({
    name: "Springing Net Leverage",
    category: "Springing",
    formula: NET_LEVERAGE,
    operator: "<=",
    threshold: 4.5,
    springingCondition: { field: "RCF_UTIL_PCT", op: ">", value: 35 },
  });

  it("is N/A (not tested) when the trigger field is below the condition", () => {
    const facts = atlasFacts({ RCF_UTIL_PCT: 20, TOT_DEBT: 200, CASH: 24 });
    const r = evaluate(def, facts, new Date("2025-12-31"));
    expect(r.springingActive).toBe(false);
  });

  it("springs to a real Pass when triggered with comfortable headroom", () => {
    // util 50% → active; leverage 4.0x vs 4.5x → headroom ~11% (a real Pass).
    const facts = atlasFacts({ RCF_UTIL_PCT: 50, TOT_DEBT: 184, CASH: 24 }); // 4.0x
    const r = evaluate(def, facts, new Date("2025-12-31"));
    expect(r.springingActive).toBe(true);
    expect(r.value).toBeCloseTo(4.0, 6);
    expect(r.pass).toBe(true);
    expect(r.headroomPct).toBeGreaterThan(10);
  });

  it("springs to a Near-breach when triggered with tight headroom", () => {
    // leverage 4.3x vs 4.5x → headroom ~4.4% (<10%) but still passing.
    const facts = atlasFacts({ RCF_UTIL_PCT: 60, TOT_DEBT: 196, CASH: 24 }); // 4.3x
    const r = evaluate(def, facts, new Date("2025-12-31"));
    expect(r.springingActive).toBe(true);
    expect(r.pass).toBe(true);
    expect(r.headroomPct).toBeGreaterThan(0);
    expect(r.headroomPct).toBeLessThan(10);
  });

  it("springs to a Breach when triggered and the test fails", () => {
    const facts = atlasFacts({ RCF_UTIL_PCT: 80, TOT_DEBT: 240, CASH: 24 }); // 5.4x
    const r = evaluate(def, facts, new Date("2025-12-31"));
    expect(r.springingActive).toBe(true);
    expect(r.pass).toBe(false);
  });
});
