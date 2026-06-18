// Adjusted-EBITDA derivation with a binding cap.
// EBITDA_ADJ = GAAP EBITDA + allowed add-backs, where "capped" add-backs are
// only allowed up to a cap (default 25% of GAAP EBITDA) and the excess is
// DISALLOWED — so the cap actually binds the covenant ratio, not just the
// visual bridge. Uncapped / un-flagged items flow through in full.
// Pure module — no Prisma/server imports.

export interface AddbackItem {
  amount: number;
  capped: boolean;
  uncapped: boolean;
}

export interface AdjustedEbitda {
  gaap: number;
  cappedTotal: number;
  capLimit: number;
  allowedCapped: number;
  disallowedCapped: number;
  allowedOther: number; // uncapped + un-flagged items, allowed in full
  uncappedTotal: number; // for the quality-of-earnings warning
  totalAddbacks: number; // gross, before the cap
  allowedAddbacks: number; // net of the cap
  adjEbitda: number; // gaap + allowedAddbacks
  capBinds: boolean;
}

export function computeAdjustedEbitda(
  gaap: number,
  items: AddbackItem[],
  capPctOfGaap = 25,
): AdjustedEbitda {
  const cappedTotal = items.filter((a) => a.capped).reduce((s, a) => s + a.amount, 0);
  const allowedOther = items.filter((a) => !a.capped).reduce((s, a) => s + a.amount, 0);
  const uncappedTotal = items.filter((a) => a.uncapped).reduce((s, a) => s + a.amount, 0);
  const capLimit = Math.max(0, (gaap * capPctOfGaap) / 100);
  const allowedCapped = Math.min(cappedTotal, capLimit);
  const disallowedCapped = +(cappedTotal - allowedCapped).toFixed(4);
  const allowedAddbacks = +(allowedCapped + allowedOther).toFixed(4);
  const totalAddbacks = +(cappedTotal + allowedOther).toFixed(4);
  return {
    gaap: +gaap.toFixed(4),
    cappedTotal: +cappedTotal.toFixed(4),
    capLimit: +capLimit.toFixed(4),
    allowedCapped: +allowedCapped.toFixed(4),
    disallowedCapped,
    allowedOther: +allowedOther.toFixed(4),
    uncappedTotal: +uncappedTotal.toFixed(4),
    totalAddbacks,
    allowedAddbacks,
    adjEbitda: +(gaap + allowedAddbacks).toFixed(4),
    capBinds: cappedTotal > capLimit + 1e-9,
  };
}
