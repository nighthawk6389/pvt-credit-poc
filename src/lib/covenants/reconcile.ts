export interface Recon {
  recomputed: number;
  reported: number;
  delta: number; // recomputed - reported
  deltaPct: number; // relative to reported
  flag: boolean; // exceeds tolerance
}

/**
 * Compare the engine's independent recomputation against the borrower-reported
 * figure from the compliance certificate. A flag fires when the gap exceeds
 * tolerance — the discrepancy a tracker would silently miss.
 */
export function reconcile(
  recomputed: number,
  reported: number,
  tolPct = 2,
  tolAbs = 0.1,
): Recon {
  const delta = recomputed - reported;
  const deltaPct = reported !== 0 ? (delta / Math.abs(reported)) * 100 : 0;
  const flag = Math.abs(deltaPct) > tolPct || Math.abs(delta) > tolAbs;
  return {
    recomputed: +recomputed.toFixed(4),
    reported: +reported.toFixed(4),
    delta: +delta.toFixed(4),
    deltaPct: +deltaPct.toFixed(2),
    flag,
  };
}
