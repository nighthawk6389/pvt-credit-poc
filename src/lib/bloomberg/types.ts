// Type contracts mirroring real Bloomberg Terminal functions.
// The MockBloombergClient implements these against deterministic fixtures;
// a future BloombergApiClient (BLPAPI / Data License) would implement the
// same interface so callers never change.

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
  borrower: string;
  oneYrPdPct: number;
  fiveYrPdPct: number;
  impliedRating: string;
  distanceToDefault: number;
  trend: "Improving" | "Stable" | "Deteriorating";
}

/** CRPR — Credit Profile / ratings. */
export interface CreditProfile {
  borrower: string;
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
  borrower: string;
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
    borrower: string;
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
  getDefaultRisk(borrower: string, leverage?: number): Promise<DefaultRisk>;
  /** CRPR <GO> */
  getCreditProfile(borrower: string, internalRating?: string): Promise<CreditProfile>;
  /** Structuring scenarios */
  runStructuringScenarios(input: {
    borrower: string;
    spreadBps: number;
    floorBps: number;
    oidPct: number;
    leverage: number;
  }): Promise<StructuringQuote[]>;
}
