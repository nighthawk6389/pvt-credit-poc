import { describe, it, expect } from "vitest";
import { MockBloombergClient } from "@/lib/bloomberg/client";
import type { FundamentalAnchor } from "@/lib/bloomberg/types";
import { evaluate, reconcile } from "@/lib/covenants/index";
import { makeDef, NET_LEVERAGE } from "./helpers";

// Zero-latency client so tests are fast and never time-dependent. The numbers
// are fully deterministic (seeded by borrower+periodEnd), independent of latency.
const bloomberg = new MockBloombergClient(0);

const ANCHOR: FundamentalAnchor = {
  ebitda: 40,
  netLeverage: 4.4,
  interestCoverage: 2.2,
  liquidity: 30,
};
const BORROWER = "Project Atlas";
const PERIOD = "2025-12-31";

// Area 4: adapter back-solve and the engine must AGREE on leverage. The mock
// back-solves a coherent field set from the reported anchor with a deliberate
// ±1% jitter on total debt; running the leverage formula through evaluate on
// those fields must land within recon tolerance of the reported anchor.
describe("adapter back-solve ↔ engine reconciliation coherence", () => {
  it("recomputed leverage from FA fields matches the reported anchor within tolerance", async () => {
    const fs = await bloomberg.getFundamentals({
      borrower: BORROWER,
      periodEnd: PERIOD,
      anchor: ANCHOR,
    });

    const def = makeDef({
      name: "Total Net Leverage",
      formula: NET_LEVERAGE,
      operator: "<=",
      threshold: 5.75,
    });
    const r = evaluate(def, fs.fields, new Date(PERIOD));

    // The engine's independent recompute and the reported figure should reconcile.
    const recon = reconcile(r.value as number, ANCHOR.netLeverage);
    // Jitter is ±1% on debt; net-leverage uses (debt-cash)/ebitda so the relative
    // gap is bounded but non-zero — exactly the "recon delta" the suite surfaces.
    expect(Math.abs(recon.deltaPct)).toBeLessThan(2);
    expect(r.value).toBeGreaterThan(0);
  });

  it("interest coverage recomputed from FA fields agrees with the reported anchor", async () => {
    const fs = await bloomberg.getFundamentals({
      borrower: BORROWER,
      periodEnd: PERIOD,
      anchor: ANCHOR,
    });
    const def = makeDef({
      name: "Interest Coverage",
      formula: "EBITDA_ADJ / INT_EXP",
      operator: ">=",
      threshold: 2.0,
    });
    const r = evaluate(def, fs.fields, new Date(PERIOD));
    // INT_EXP is back-solved as ebitda/coverage (no jitter) → exact agreement.
    expect(r.value as number).toBeCloseTo(ANCHOR.interestCoverage, 1);
  });

  it("minimum liquidity recomputed from FA fields agrees with the reported anchor", async () => {
    const fs = await bloomberg.getFundamentals({
      borrower: BORROWER,
      periodEnd: PERIOD,
      anchor: ANCHOR,
    });
    const def = makeDef({
      name: "Minimum Liquidity",
      formula: "CASH + RCF_AVAILABLE",
      operator: ">=",
      threshold: 10,
      unit: "$MM",
    });
    const r = evaluate(def, fs.fields, new Date(PERIOD));
    // CASH (0.55*liq) + RCF_AVAILABLE (0.45*liq) reconstructs the liquidity anchor.
    expect(r.value as number).toBeCloseTo(ANCHOR.liquidity, 1);
  });

  it("is deterministic: two calls with identical inputs return identical fields", async () => {
    const a = await bloomberg.getFundamentals({ borrower: BORROWER, periodEnd: PERIOD, anchor: ANCHOR });
    const b = await bloomberg.getFundamentals({ borrower: BORROWER, periodEnd: PERIOD, anchor: ANCHOR });
    expect(b.fields).toEqual(a.fields);
  });

  it("analyst overrides flow through to the engine recompute", async () => {
    const base = await bloomberg.getFundamentals({ borrower: BORROWER, periodEnd: PERIOD, anchor: ANCHOR });
    const over = await bloomberg.getFundamentals({
      borrower: BORROWER,
      periodEnd: PERIOD,
      anchor: ANCHOR,
      overrides: { EBITDA_ADJ: base.fields.EBITDA_ADJ + 5 }, // +5 of EBITDA add-backs
    });
    const def = makeDef({ name: "Lev", formula: NET_LEVERAGE, operator: "<=", threshold: 5.75 });
    const rBase = evaluate(def, base.fields, new Date(PERIOD));
    const rOver = evaluate(def, over.fields, new Date(PERIOD));
    // Higher EBITDA denominator → lower leverage.
    expect(rOver.value as number).toBeLessThan(rBase.value as number);
  });
});

// Area 4b: the bisection break-even solver must round-trip against evaluate.
describe("break-even EBITDA solver round-trips against evaluate", () => {
  it("the solved EBITDA is below current and drives headroom to ~0 when substituted back", async () => {
    const fs = await bloomberg.getFundamentals({
      borrower: BORROWER,
      periodEnd: PERIOD,
      anchor: ANCHOR,
    });
    const def = makeDef({
      name: "Total Net Leverage",
      formula: NET_LEVERAGE,
      operator: "<=",
      threshold: 5.0, // current leverage ~4.4x passes; break-even EBITDA is below current
    });
    const r = evaluate(def, fs.fields, new Date(PERIOD));
    const be = r.breakevenEbitda;
    expect(be).not.toBeNull();
    expect(Number.isFinite(be as number)).toBe(true);

    const currentEbitda = fs.fields.EBITDA_ADJ;
    expect(be as number).toBeLessThan(currentEbitda); // less EBITDA → higher leverage → tighter

    // Round-trip: plug the break-even EBITDA back in → headroom ~0 (covenant just binds).
    const atBreakeven = evaluate(def, { ...fs.fields, EBITDA_ADJ: be as number }, new Date(PERIOD));
    expect(Math.abs(atBreakeven.headroomPct)).toBeLessThan(0.5);
  });

  it("returns null when the EBITDA basis is absent from the facts", () => {
    const def = makeDef({
      name: "Liquidity (no EBITDA)",
      formula: "CASH + RCF_AVAILABLE",
      operator: ">=",
      threshold: 10,
      unit: "$MM",
    });
    // No EBITDA_ADJ in facts → solver has no monotone variable to bracket.
    const r = evaluate(def, { CASH: 24, RCF_AVAILABLE: 20 }, new Date(PERIOD));
    expect(r.breakevenEbitda).toBeNull();
  });
});
