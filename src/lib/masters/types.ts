// Contracts for the systems of record the deal room links to.
//
// The deal room is an overlay (see docs/data-model/README.md): borrowers live
// in an entity master and booked loans in a security master. The deal room
// keeps a link to each (`masterRef`) and reads their details through these
// interfaces — never from its own tables. Mocks implement them today
// (./mock.ts); a real entity master or security master (WSO, Geneva, an MDM)
// implements the same interfaces, so callers never change.

/** A borrower as the entity master describes it. Read-only to the deal room. */
export interface BorrowerProfile {
  ref: string;
  name: string;
  sector: string;
  description: string | null;
  hqCity: string | null;
  website: string | null;
  ceo: string | null;
  founded: number | null;
}

export type NewBorrower = Omit<BorrowerProfile, "ref">;

/** The terms of a facility: what the security master books, or a term sheet proposes. */
export interface FacilityTerms {
  type: string;
  seniority: string;
  commitment: number; // $MM
  spreadBps: number;
  floorBps: number;
  oidPct: number;
  pikBps: number;
  upfrontFeeBps: number;
  maturity: Date | null;
}

/** A booked instrument, as the security master holds it. */
export interface InstrumentRecord extends FacilityTerms {
  ref: string;
  name: string;
  currency: string;
  /** Drawn balance, as the agent reports it. */
  funded: number; // $MM
}

export type NewInstrument = Omit<InstrumentRecord, "ref">;

export interface EntityMasterClient {
  /** Missing refs are simply absent from the map. */
  getBorrowers(refs: string[]): Promise<Map<string, BorrowerProfile>>;
  createBorrower(input: NewBorrower): Promise<BorrowerProfile>;
}

export interface SecurityMasterClient {
  /** Missing refs are simply absent from the map. */
  getInstruments(refs: string[]): Promise<Map<string, InstrumentRecord>>;
  bookInstrument(input: NewInstrument): Promise<InstrumentRecord>;
}
