// Type contracts mirroring real Bloomberg Terminal functions.
// The MockBloombergClient implements these against deterministic fixtures;
// a future BloombergApiClient (BLPAPI / Data License) would implement the
// same interface so callers never change.

/**
 * Which company an issuer-level request (FA, DRSK, CRPR) is about. Resolved
 * from the borrower's stored identifiers by `pickIssuerKey`, never from its
 * name: names are not unique, and they change.
 */
export interface IssuerKey {
  scheme: "BBG_COMPANY" | "LEI";
  value: string;
  /** Display only. Never used to look anything up. */
  name: string;
}

/** DLEN — Private Direct Lending comps. */
export interface DirectLendingComp {
  borrower: string;
  sector: string;
  facility: string;
  spreadBps: number;
  oidPct: number;
  leverage: number;
  yieldPct: number;
  size: number; // $MM
  date: string; // ISO
}

/** PORT — Portfolio & Risk Analytics. */
export interface PortfolioRisk {
  weightedSpreadBps: number;
  weightedLeverage: number;
  weightedYieldPct: number;
  durationYrs: number;
  var95Pct: number; // 1y 95% VaR as % of NAV
  sectorExposure: { sector: string; pct: number }[];
  ratingExposure: { rating: string; pct: number }[];
}

/** DRSK — Default Risk. */
export interface DefaultRisk {
  issuer: IssuerKey;
  oneYrPdPct: number;
  fiveYrPdPct: number;
  impliedRating: string;
  distanceToDefault: number;
  trend: "Improving" | "Stable" | "Deteriorating";
}

/** CRPR — Credit Profile / ratings. */
export interface CreditProfile {
  issuer: IssuerKey;
  agencyRatings: { agency: string; rating: string; outlook: string }[];
  internalRating: string;
  spreadToBenchmarkBps: number;
}

/** Structuring / CLO scenario tooling. */
export interface StructuringQuote {
  scenario: string;
  baseRatePct: number;
  spreadBps: number;
  floorBps: number;
  oidPct: number;
  allInYieldPct: number;
  waLifeYrs: number;
  pricePct: number;
  netLeverage: number;
}

/** FA <GO> — standardized fundamental field set for a borrower/period. */
export interface FundamentalSet {
  issuer: IssuerKey;
  periodEnd: string; // ISO
  periodType: "Q" | "A" | "LTM";
  fields: Record<string, number>; // mnemonic → value ($MM unless % / x)
  source: "BBG";
}

/** The reported figures a covenant engine anchors the fundamental recompute to. */
export interface FundamentalAnchor {
  ebitda: number;
  netLeverage: number;
  interestCoverage: number;
  liquidity: number;
  capex?: number | null;
  revenue?: number | null;
}

export interface BloombergClient {
  /** DLEN <GO> */
  getDirectLendingComps(sector: string): Promise<DirectLendingComp[]>;
  /**
   * FA <GO> — pull standardized fundamental fields for a borrower/period.
   * `anchor` (the borrower's reported financials) keeps the independent
   * recompute coherent; `overrides` apply field-level analyst overrides.
   */
  getFundamentals(input: {
    issuer: IssuerKey;
    periodEnd: string;
    periodType?: "Q" | "A" | "LTM";
    anchor?: FundamentalAnchor;
    overrides?: Record<string, number>;
  }): Promise<FundamentalSet>;
  /** PORT <GO> */
  getPortfolioRisk(input: {
    positions: { sector: string; spreadBps: number; leverage: number; yieldPct: number; size: number; rating?: string }[];
  }): Promise<PortfolioRisk>;
  /** DRSK <GO> */
  getDefaultRisk(issuer: IssuerKey, leverage?: number): Promise<DefaultRisk>;
  /** CRPR <GO> */
  getCreditProfile(issuer: IssuerKey, internalRating?: string): Promise<CreditProfile>;
  /**
   * Structuring scenarios. Prices our own proposed terms, so it identifies no
   * issuer and needs no Bloomberg coverage.
   */
  runStructuringScenarios(input: {
    spreadBps: number;
    floorBps: number;
    oidPct: number;
    leverage: number;
  }): Promise<StructuringQuote[]>;
}
