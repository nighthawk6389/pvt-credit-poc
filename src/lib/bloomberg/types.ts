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

export interface BloombergClient {
  /** DLEN <GO> */
  getDirectLendingComps(sector: string): Promise<DirectLendingComp[]>;
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
