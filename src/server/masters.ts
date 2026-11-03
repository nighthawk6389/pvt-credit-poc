import "server-only";

import { db } from "@/lib/db";
import { entityMaster, securityMaster } from "@/lib/masters";
import type { BorrowerProfile, FacilityTerms } from "@/lib/masters/types";
import { parseTermSheet, trancheTerms } from "@/lib/masters/term-sheet";

// The one place the deal room joins its own rows to the systems of record.
// Queries fetch local rows — which hold only links — then call these to read
// a borrower's details from the entity master and a facility's terms from the
// security master (or, before booking, from the deal's latest term sheet).
// Each call batches its lookups, so a page costs one round-trip per system.

type BorrowerLink = { masterRef: string | null };

/** Shown when a link points at nothing — a broken link is visible, not a crash. */
const UNKNOWN_BORROWER: Omit<BorrowerProfile, "ref"> = {
  name: "Unknown borrower",
  sector: "—",
  description: null,
  hqCity: null,
  website: null,
  ceo: null,
  founded: null,
};

/**
 * Read the entity-master profile for each borrower. Returns a function that
 * merges a borrower row with its profile, so call sites read `b.name` as before.
 */
export async function borrowerProfiles(borrowers: BorrowerLink[]) {
  const refs = borrowers.map((b) => b.masterRef).filter((r): r is string => !!r);
  const profiles = await entityMaster.getBorrowers(refs);
  return <B extends BorrowerLink>(b: B): B & Omit<BorrowerProfile, "ref"> => {
    const p = b.masterRef ? profiles.get(b.masterRef) : undefined;
    const { ref: _ref, ...profile } = p ?? { ref: "", ...UNKNOWN_BORROWER };
    void _ref;
    return { ...b, ...profile };
  };
}

export type TermsSource = "security-master" | "term-sheet" | "missing";

export type FacilityTermsView = FacilityTerms & {
  /** Drawn balance; zero until booked. */
  funded: number;
  termsSource: TermsSource;
};

type FacilityLink = { id: string; dealId: string; masterRef: string | null };

const NO_TERMS: FacilityTermsView = {
  type: "—",
  seniority: "—",
  commitment: 0,
  spreadBps: 0,
  floorBps: 0,
  oidPct: 0,
  pikBps: 0,
  upfrontFeeBps: 0,
  maturity: null,
  funded: 0,
  termsSource: "missing",
};

/**
 * Read each facility's terms: from the security master once it is booked,
 * otherwise from the latest version of its deal's term sheet. Returns a
 * function that merges a facility row with its terms.
 */
export async function facilityTerms(facilities: FacilityLink[]) {
  const booked = facilities.filter((f) => f.masterRef);
  const proposedDealIds = [...new Set(facilities.filter((f) => !f.masterRef).map((f) => f.dealId))];

  const [instruments, sheets] = await Promise.all([
    securityMaster.getInstruments(booked.map((f) => f.masterRef as string)),
    proposedDealIds.length
      ? db.termSheet.findMany({
          where: { dealId: { in: proposedDealIds } },
          orderBy: { versionNo: "desc" },
          distinct: ["dealId"],
        })
      : Promise.resolve([]),
  ]);

  const proposed = new Map<string, FacilityTermsView>();
  for (const sheet of sheets) {
    for (const t of parseTermSheet(sheet.terms).tranches) {
      proposed.set(t.facilityId, { ...trancheTerms(t), funded: 0, termsSource: "term-sheet" });
    }
  }

  return <F extends FacilityLink>(f: F): F & FacilityTermsView => {
    if (f.masterRef) {
      const inst = instruments.get(f.masterRef);
      if (!inst) return { ...f, ...NO_TERMS };
      const { ref: _ref, name: _name, currency: _currency, ...terms } = inst;
      void _ref;
      void _name;
      void _currency;
      return { ...f, ...terms, termsSource: "security-master" };
    }
    return { ...f, ...(proposed.get(f.id) ?? NO_TERMS) };
  };
}

type Profiled<B> = B & Omit<BorrowerProfile, "ref">;
type Termed<F> = F & FacilityTermsView;

/** A deal with its borrower's profile and its facilities' terms filled in. */
export async function withMasters<D extends { borrower: BorrowerLink; facilities: FacilityLink[] }>(
  deal: D,
): Promise<
  Omit<D, "borrower" | "facilities"> & {
    borrower: Profiled<D["borrower"]>;
    facilities: Termed<D["facilities"][number]>[];
  }
> {
  const [profile, terms] = await Promise.all([borrowerProfiles([deal.borrower]), facilityTerms(deal.facilities)]);
  return { ...deal, borrower: profile(deal.borrower), facilities: deal.facilities.map(terms) };
}

/** A deal with its borrower's profile filled in. */
export async function withBorrower<D extends { borrower: BorrowerLink }>(
  deal: D,
): Promise<Omit<D, "borrower"> & { borrower: Profiled<D["borrower"]> }> {
  const profile = await borrowerProfiles([deal.borrower]);
  return { ...deal, borrower: profile(deal.borrower) };
}

/** A deal with its facilities' terms filled in. */
export async function withFacilityTerms<D extends { facilities: FacilityLink[] }>(
  deal: D,
): Promise<Omit<D, "facilities"> & { facilities: Termed<D["facilities"][number]>[] }> {
  const terms = await facilityTerms(deal.facilities);
  return { ...deal, facilities: deal.facilities.map(terms) };
}
