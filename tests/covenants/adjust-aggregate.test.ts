import { describe, it, expect } from "vitest";

import {
  computeAdjustedEbitda,
  assembleLtm,
  assembleLtmSeries,
  fieldAggregation,
  evaluate,
  type AddbackItem,
} from "@/lib/covenants/index";
import { makeDef } from "./helpers";

// These tests validate the TWO cross-component upgrades end-to-end:
//  (a) period-basis: flow-vs-stock LTM assembly feeding the evaluator
//  (b) a binding add-back cap deriving EBITDA_ADJ that tightens the covenant

describe("add-back cap derivation (computeAdjustedEbitda)", () => {
  it("allows capped add-backs in full when under the cap", () => {
    // gaap 32 → cap = 25% × 32 = 8; capped 3+2=5 < 8 ⇒ all allowed
    const items: AddbackItem[] = [
      { amount: 3, capped: true, uncapped: false },
      { amount: 2, capped: true, uncapped: false },
      { amount: 4, capped: false, uncapped: true },
    ];
    const r = computeAdjustedEbitda(32, items);
    expect(r.capBinds).toBe(false);
    expect(r.disallowedCapped).toBe(0);
    expect(r.adjEbitda).toBe(41); // 32 + 5 + 4
  });

  it("disallows the excess when capped add-backs breach the cap", () => {
    // gaap 32 → cap 8; capped 6+5=11 > 8 ⇒ 3 disallowed; uncapped 4 still allowed
    const items: AddbackItem[] = [
      { amount: 6, capped: true, uncapped: false },
      { amount: 5, capped: true, uncapped: false },
      { amount: 4, capped: false, uncapped: true },
    ];
    const r = computeAdjustedEbitda(32, items);
    expect(r.capBinds).toBe(true);
    expect(r.allowedCapped).toBe(8);
    expect(r.disallowedCapped).toBe(3);
    expect(r.adjEbitda).toBe(44); // 32 + 8 + 4, NOT 47
  });

  it("a binding cap lowers EBITDA_ADJ and tightens the leverage covenant through the engine", () => {
    const gaap = 32;
    const facts = { TOT_DEBT: 248, CASH: 18 }; // net debt 230
    const netDebt = 230;
    const lev = makeDef({
      name: "Total Net Leverage",
      formula: "(TOT_DEBT - CASH) / EBITDA_ADJ",
      operator: "<=",
      threshold: 5.0,
    });

    // Borrower's claimed bridge: 11 capped + 4 uncapped; cap (8) disallows 3.
    const capped = computeAdjustedEbitda(gaap, [
      { amount: 6, capped: true, uncapped: false },
      { amount: 5, capped: true, uncapped: false },
      { amount: 4, capped: false, uncapped: true },
    ]);
    const uncappedAdj = gaap + 6 + 5 + 4; // 47 if the cap were ignored

    const withCap = evaluate(lev, { ...facts, EBITDA_ADJ: capped.adjEbitda }, new Date("2025-12-31"));
    const withoutCap = evaluate(lev, { ...facts, EBITDA_ADJ: uncappedAdj }, new Date("2025-12-31"));

    expect(capped.adjEbitda).toBe(44);
    // Leverage is HIGHER (worse) once the cap binds: 230/44 > 230/47
    expect(withCap.value!).toBeGreaterThan(withoutCap.value!);
    expect(withCap.value!).toBeCloseTo(netDebt / 44, 5);
    // The cap flips this position from compliant (4.89x) to breach (5.23x).
    expect(withoutCap.pass).toBe(true);
    expect(withCap.pass).toBe(false);
  });
});

describe("period-basis LTM assembly (flow vs stock)", () => {
  it("classifies P&L/cash-flow fields as flow and balance-sheet as stock", () => {
    expect(fieldAggregation("EBITDA")).toBe("flow");
    expect(fieldAggregation("INT_EXP")).toBe("flow");
    expect(fieldAggregation("CAPEX")).toBe("flow");
    expect(fieldAggregation("TOT_DEBT")).toBe("stock");
    expect(fieldAggregation("CASH")).toBe("stock");
    expect(fieldAggregation("RCF_UTIL_PCT")).toBe("stock");
    expect(fieldAggregation("EBITDA_ADJ")).toBe("derived");
    expect(fieldAggregation("NET_DEBT")).toBe("derived");
  });

  it("sums flow fields over 4 quarters and takes latest for stock fields", () => {
    const quarters = [
      { periodEnd: "2025-03-31T00:00:00.000Z", facts: { EBITDA: 9, TOT_DEBT: 100, CASH: 20, RCF_UTIL_PCT: 30 } },
      { periodEnd: "2025-06-30T00:00:00.000Z", facts: { EBITDA: 10, TOT_DEBT: 105, CASH: 18, RCF_UTIL_PCT: 33 } },
      { periodEnd: "2025-09-30T00:00:00.000Z", facts: { EBITDA: 11, TOT_DEBT: 110, CASH: 16, RCF_UTIL_PCT: 41 } },
      { periodEnd: "2025-12-31T00:00:00.000Z", facts: { EBITDA: 12, TOT_DEBT: 108, CASH: 22, RCF_UTIL_PCT: 28 } },
    ];
    const ltm = assembleLtm(quarters);
    expect(ltm.EBITDA).toBe(42); // 9+10+11+12 flow
    expect(ltm.TOT_DEBT).toBe(108); // latest stock
    expect(ltm.CASH).toBe(22); // latest stock
    expect(ltm.RCF_UTIL_PCT).toBe(28); // latest stock
  });

  it("annualizes a short (<4 quarter) window for flow fields", () => {
    const quarters = [
      { periodEnd: "2025-09-30T00:00:00.000Z", facts: { EBITDA: 10, TOT_DEBT: 110 } },
      { periodEnd: "2025-12-31T00:00:00.000Z", facts: { EBITDA: 12, TOT_DEBT: 108 } },
    ];
    const ltm = assembleLtm(quarters);
    expect(ltm.EBITDA).toBe(44); // (10+12)/2 * 4
    expect(ltm.TOT_DEBT).toBe(108); // stock unaffected
  });

  it("assembled LTM facts feed the evaluator to a sane leverage", () => {
    const quarters = [
      { periodEnd: "2025-03-31T00:00:00.000Z", facts: { EBITDA_ADJ_Q: 0 } }, // ignored
      { periodEnd: "2025-06-30T00:00:00.000Z", facts: { EBITDA: 10, TOT_DEBT: 200, CASH: 12 } },
      { periodEnd: "2025-09-30T00:00:00.000Z", facts: { EBITDA: 10.5, TOT_DEBT: 205, CASH: 14 } },
      { periodEnd: "2025-12-31T00:00:00.000Z", facts: { EBITDA: 11, TOT_DEBT: 198, CASH: 16 } },
    ];
    const series = assembleLtmSeries(quarters);
    const latest = series[series.length - 1].facts;
    // Use GAAP EBITDA as the basis here (no add-backs in this fixture)
    const lev = makeDef({
      name: "Lev",
      formula: "(TOT_DEBT - CASH) / EBITDA",
      operator: "<=",
      threshold: 7,
      ebitdaBasis: "EBITDA",
    });
    const r = evaluate(lev, latest, new Date("2025-12-31"));
    // LTM EBITDA over the 3 quarters present, annualized: (10+10.5+11)/3*4 = 42
    expect(latest.EBITDA).toBeCloseTo(42, 5);
    expect(latest.TOT_DEBT).toBe(198); // latest stock
    expect(r.value!).toBeCloseTo((198 - 16) / 42, 5);
  });
});
