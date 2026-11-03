import { z } from "zod";

import type { FacilityTerms } from "./types";

// A term sheet is the deal room's record of the terms it proposed for each
// tranche before booking — the version a committee approves. Once a tranche
// is booked its terms come from the security master and the term sheet stays
// as the record of what was approved, never as a second copy of live terms.

const Tranche = z.object({
  facilityId: z.string().min(1),
  type: z.string().min(1),
  seniority: z.string().min(1),
  commitment: z.number().nonnegative(),
  spreadBps: z.number().int(),
  floorBps: z.number().int().nonnegative(),
  oidPct: z.number().nonnegative(),
  pikBps: z.number().int().nonnegative(),
  upfrontFeeBps: z.number().int().nonnegative(),
  /** ISO date, or null when not yet set. */
  maturity: z.string().nullable(),
});

export const TermSheetTermsSchema = z.object({ tranches: z.array(Tranche) });
export type ProposedTranche = z.infer<typeof Tranche>;
export type TermSheetTerms = z.infer<typeof TermSheetTermsSchema>;

/** Validate stored JSON; a malformed sheet is an error, not silently empty terms. */
export function parseTermSheet(json: unknown): TermSheetTerms {
  return TermSheetTermsSchema.parse(json);
}

export function trancheTerms(t: ProposedTranche): FacilityTerms {
  return {
    type: t.type,
    seniority: t.seniority,
    commitment: t.commitment,
    spreadBps: t.spreadBps,
    floorBps: t.floorBps,
    oidPct: t.oidPct,
    pikBps: t.pikBps,
    upfrontFeeBps: t.upfrontFeeBps,
    maturity: t.maturity ? new Date(t.maturity) : null,
  };
}

export function toTranche(facilityId: string, terms: FacilityTerms): ProposedTranche {
  return {
    facilityId,
    type: terms.type,
    seniority: terms.seniority,
    commitment: terms.commitment,
    spreadBps: terms.spreadBps,
    floorBps: terms.floorBps,
    oidPct: terms.oidPct,
    pikBps: terms.pikBps,
    upfrontFeeBps: terms.upfrontFeeBps,
    maturity: terms.maturity ? terms.maturity.toISOString().slice(0, 10) : null,
  };
}
