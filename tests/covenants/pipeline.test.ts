import { describe, it, expect } from "vitest";
import {
  evaluate,
  reconcile,
  deriveCovenantStatus,
  type CovenantStatus,
} from "@/lib/covenants/index";
import { makeDef, atlasFacts, NET_LEVERAGE } from "./helpers";

// Area 1: full evaluation pipeline — evaluate → reconcile → deriveCovenantStatus.
// We run the same end-to-end machinery used in production (parse via makeDef,
// evaluate, then reconcile the recomputed value against a borrower-REPORTED
// figure, then derive the single status). One asOf date, fixed 5.75x threshold.

const ASOF = new Date("2025-12-31");

/**
 * Drive the whole pipeline for a net-leverage covenant and return the derived
 * status plus the intermediate recon, exactly as a server page would assemble it.
 */
function runLeveragePipeline(opts: {
  facts: Record<string, number>;
  threshold: number;
  reported: number; // borrower's reported leverage from the compliance cert
}): { status: CovenantStatus; value: number | null; headroomPct: number; reconFlag: boolean } {
  const def = makeDef({
    name: "Total Net Leverage",
    formula: NET_LEVERAGE,
    operator: "<=",
    threshold: opts.threshold,
  });
  const r = evaluate(def, opts.facts, ASOF);
  const recon = reconcile(r.value as number, opts.reported);
  const status = deriveCovenantStatus({
    category: def.category,
    recomputed: r.value,
    thresholdApplied: r.thresholdApplied,
    operator: r.operator,
    headroomPct: r.headroomPct,
    reconFlag: recon.flag,
    hasActual: true,
    springingActive: r.springingActive,
  });
  return { status, value: r.value, headroomPct: r.headroomPct, reconFlag: recon.flag };
}

describe("full evaluation pipeline (evaluate + reconcile + status)", () => {
  it("clean Pass: comfortable headroom, recomputed matches reported", () => {
    // (200-24)/40 = 4.40x vs 5.75x → headroom ~23.5%, no recon gap.
    const out = runLeveragePipeline({
      facts: atlasFacts(),
      threshold: 5.75,
      reported: 4.4,
    });
    expect(out.value).toBeCloseTo(4.4, 6);
    expect(out.headroomPct).toBeGreaterThan(10);
    expect(out.reconFlag).toBe(false);
    expect(out.status).toBe("Pass");
  });

  it("Near-breach: passes but headroom < 10% band", () => {
    // Push leverage to ~5.4x against 5.75x → headroom ~6% (<10%), still passes.
    // (TOT_DEBT - CASH) = 5.4 * 40 = 216 → TOT_DEBT = 240 with CASH 24.
    const facts = atlasFacts({ TOT_DEBT: 240, CASH: 24 });
    const out = runLeveragePipeline({ facts, threshold: 5.75, reported: 5.4 });
    expect(out.value).toBeCloseTo(5.4, 6);
    expect(out.headroomPct).toBeGreaterThan(0);
    expect(out.headroomPct).toBeLessThan(10);
    expect(out.reconFlag).toBe(false);
    expect(out.status).toBe("Near-breach");
  });

  it("Breach: recomputed value fails the test (judged on recomputed, not reported)", () => {
    // Leverage 6.4x > 5.75x. Reported is rosier (5.7x) but Breach is on recomputed.
    const facts = atlasFacts({ TOT_DEBT: 280, CASH: 24 }); // (280-24)/40 = 6.4x
    const out = runLeveragePipeline({ facts, threshold: 5.75, reported: 5.7 });
    expect(out.value).toBeCloseTo(6.4, 6);
    expect(out.status).toBe("Breach");
  });

  it("Recon-flag: passes with healthy headroom but recomputed vs reported gap exceeds tolerance", () => {
    // Recomputed 4.40x, comfortably passing 5.75x (headroom ~23.5% → not near).
    // Borrower reported 4.05x — a ~8.6% relative gap, well over the 2% tolerance.
    const out = runLeveragePipeline({
      facts: atlasFacts(),
      threshold: 5.75,
      reported: 4.05,
    });
    expect(out.value).toBeCloseTo(4.4, 6);
    expect(out.headroomPct).toBeGreaterThan(10); // would be a plain Pass absent the gap
    expect(out.reconFlag).toBe(true);
    expect(out.status).toBe("Recon-flag");
  });

  it("status precedence: Breach outranks a recon flag", () => {
    // Even with a reported/recomputed gap, a failing recomputed value is a Breach.
    const facts = atlasFacts({ TOT_DEBT: 280, CASH: 24 }); // 6.4x
    const out = runLeveragePipeline({ facts, threshold: 5.75, reported: 5.0 });
    expect(out.reconFlag).toBe(true);
    expect(out.status).toBe("Breach");
  });
});
