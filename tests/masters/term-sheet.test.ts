import { describe, it, expect } from "vitest";

import { parseTermSheet, toTranche, trancheTerms } from "@/lib/masters/term-sheet";
import type { FacilityTerms } from "@/lib/masters/types";

// Before booking, a tranche's terms exist only on its deal's term sheet, stored
// as JSON. These pin the two properties every page depends on: terms survive
// the trip into the sheet and back unchanged, and a damaged sheet fails loudly
// instead of rendering as a facility with zero spread.

const TERMS: FacilityTerms = {
  type: "Unitranche",
  seniority: "First Lien",
  commitment: 160,
  spreadBps: 575,
  floorBps: 100,
  oidPct: 1,
  pikBps: 0,
  upfrontFeeBps: 250,
  maturity: new Date(Date.UTC(2031, 6, 15)),
};

describe("term sheets", () => {
  it("return the same terms that were written, maturity included as a calendar date", () => {
    const stored = JSON.parse(JSON.stringify({ tranches: [toTranche("fac_1", TERMS)] }));
    expect(stored.tranches[0].maturity).toBe("2031-07-15");
    const [tranche] = parseTermSheet(stored).tranches;
    expect(trancheTerms(tranche)).toEqual(TERMS);
  });

  it("reject a sheet whose terms are missing or mistyped rather than reading zeros", () => {
    const missingSpread = { tranches: [{ ...toTranche("fac_1", TERMS), spreadBps: undefined }] };
    const textCommitment = { tranches: [{ ...toTranche("fac_1", TERMS), commitment: "160" }] };
    expect(() => parseTermSheet(missingSpread)).toThrow();
    expect(() => parseTermSheet(textCommitment)).toThrow();
    expect(() => parseTermSheet({})).toThrow();
  });
});
