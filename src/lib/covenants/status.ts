import type { CovenantStatus, Operator } from "./types";
import { passes } from "./evaluate";

export const NEAR_BREACH_BAND_PCT = 10; // headroom below this ⇒ Near-breach

/**
 * Single source of truth for covenant status. Precedence:
 *   Waived → reporting Late/Missing → springing-not-met → Breach (recomputed) →
 *   Recon-flag (passes but reconciliation gap) → Near-breach (tight headroom) → Pass.
 * Breach is ALWAYS judged on the recomputed (independent) value; the reported
 * value and delta are surfaced separately.
 */
export function deriveCovenantStatus(args: {
  category: string;
  waived?: boolean;
  springingActive?: boolean;
  recomputed: number | null;
  thresholdApplied: number;
  operator: Operator;
  headroomPct: number;
  reconFlag?: boolean;
  reportingStatus?: string; // for Reporting covenants: Delivered|Late|Missing|Pending
  hasActual?: boolean;
}): CovenantStatus {
  const {
    category,
    waived,
    springingActive,
    recomputed,
    thresholdApplied,
    operator,
    headroomPct,
    reconFlag,
    reportingStatus,
    hasActual,
  } = args;

  if (waived) return "Waived";

  if (category === "Reporting") {
    if (reportingStatus === "Late") return "Late";
    if (reportingStatus === "Missing") return "Missing";
    if (reportingStatus === "Delivered") return "Pass";
    return "Upcoming";
  }

  if (springingActive === false) return "N/A-springing";
  if (recomputed === null || !hasActual) return "Upcoming";

  if (!passes(recomputed, thresholdApplied, operator)) return "Breach";
  if (reconFlag) return "Recon-flag";
  if (headroomPct < NEAR_BREACH_BAND_PCT) return "Near-breach";
  return "Pass";
}
