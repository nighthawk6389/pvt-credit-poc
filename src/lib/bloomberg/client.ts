import type {
  BloombergClient,
  CreditProfile,
  DefaultRisk,
  DirectLendingComp,
  FundamentalSet,
  PortfolioRisk,
  StructuringQuote,
} from "./types";

// Deterministic pseudo-random from a string seed so the same borrower/sector
// always returns the same numbers (stable demos & screenshots).
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seeded(seed: string) {
  let s = hash(seed) || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0xffffffff;
  };
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

const COMP_BORROWERS = [
  "Cedarwood Holdings",
  "Atlas Medtech",
  "Brightline Services",
  "Summit Specialty",
  "Harborview Care",
  "Vantage Software",
  "Ironbridge Mfg",
  "Crestline Foods",
  "Northgate Logistics",
  "Pinecrest Dental",
];

const AGENCIES = ["Moody's", "S&P", "Fitch"] as const;
const OUTLOOKS = ["Stable", "Positive", "Negative"] as const;

/** Simulated Bloomberg adapter. Swap for a real BLPAPI/Data License client. */
export class MockBloombergClient implements BloombergClient {
  private latencyMs: number;
  constructor(latencyMs = 140) {
    this.latencyMs = latencyMs;
  }

  private async delay() {
    if (this.latencyMs > 0)
      await new Promise((r) => setTimeout(r, this.latencyMs));
  }

  async getFundamentals(input: {
    borrower: string;
    periodEnd: string;
    periodType?: "Q" | "A" | "LTM";
    anchor?: import("./types").FundamentalAnchor;
    overrides?: Record<string, number>;
  }): Promise<FundamentalSet> {
    await this.delay();
    const rng = seeded(`FA:${input.borrower}:${input.periodEnd}`);
    const a = input.anchor;

    // Back-solve a coherent field set from the reported anchor so the
    // independent recompute lands ~0.5-1.5% off reported (the recon delta),
    // rather than diverging wildly. Without an anchor, synthesize plausibly.
    const ebitda = a?.ebitda ?? 30 + rng() * 30;
    const netLeverage = a?.netLeverage ?? 3.5 + rng() * 2;
    const coverage = a?.interestCoverage ?? 1.8 + rng();
    const liquidity = a?.liquidity ?? 15 + rng() * 20;
    const capex = a?.capex ?? ebitda * 0.08;
    const revenue = a?.revenue ?? ebitda / (0.18 + rng() * 0.06);

    // tiny deterministic jitter applied to ONE field (total debt) so the
    // recomputed leverage differs slightly from the reported figure.
    const jitter = 1 + (rng() - 0.5) * 0.02; // ±1%
    const netDebt = netLeverage * ebitda;
    const cash = +(liquidity * 0.55).toFixed(1);
    const totDebt = +((netDebt + cash) * jitter).toFixed(1);
    const intExp = +(ebitda / coverage).toFixed(1);
    const schedAmort = +(totDebt * 0.01).toFixed(1);
    const taxes = +(ebitda * 0.06).toFixed(1);

    const fields: Record<string, number> = {
      SALES_REV_TURN: +revenue.toFixed(1),
      EBITDA: +ebitda.toFixed(1),
      // EBITDA_ADJ is filled by adding the add-back ledger downstream; default to GAAP here.
      EBITDA_ADJ: +ebitda.toFixed(1),
      TOT_DEBT: totDebt,
      SR_DEBT: +(totDebt * 0.78).toFixed(1),
      CASH: cash,
      INT_EXP: intExp,
      CAPEX: +capex.toFixed(1),
      SCHED_AMORT: schedAmort,
      FIXED_CHARGES: +(intExp + schedAmort + taxes).toFixed(1),
      RCF_AVAILABLE: +(liquidity * 0.45).toFixed(1),
      RCF_UTIL_PCT: +(rng() * 35).toFixed(1),
    };

    if (input.overrides) Object.assign(fields, input.overrides);

    return {
      borrower: input.borrower,
      periodEnd: input.periodEnd,
      periodType: input.periodType ?? "LTM",
      fields,
      source: "BBG",
    };
  }

  async getDirectLendingComps(sector: string): Promise<DirectLendingComp[]> {
    await this.delay();
    const rng = seeded(`DLEN:${sector}`);
    const n = 6 + Math.floor(rng() * 3);
    return Array.from({ length: n }, (_, i) => {
      const spread = 475 + Math.floor(rng() * 300);
      const leverage = 3 + rng() * 3.2;
      const oid = +(0.5 + rng() * 2.5).toFixed(2);
      const base = 4.35; // SOFR proxy
      const allIn = base + spread / 100 + oid / 5;
      const monthsAgo = Math.floor(rng() * 14);
      const d = new Date(2026, 5, 1);
      d.setMonth(d.getMonth() - monthsAgo);
      return {
        borrower: pick(rng, COMP_BORROWERS) + ` ${i + 1}`,
        sector,
        facility: pick(rng, ["Unitranche", "First Lien TL", "First Lien TL"]),
        spreadBps: spread,
        oidPct: oid,
        leverage: +leverage.toFixed(1),
        yieldPct: +allIn.toFixed(2),
        size: 50 + Math.floor(rng() * 200),
        date: d.toISOString(),
      };
    });
  }

  async getPortfolioRisk(input: {
    positions: {
      sector: string;
      spreadBps: number;
      leverage: number;
      yieldPct: number;
      size: number;
      rating?: string;
    }[];
  }): Promise<PortfolioRisk> {
    await this.delay();
    const { positions } = input;
    const total = positions.reduce((s, p) => s + p.size, 0) || 1;
    const w = (sel: (p: (typeof positions)[number]) => number) =>
      positions.reduce((s, p) => s + sel(p) * p.size, 0) / total;

    const sectorMap = new Map<string, number>();
    for (const p of positions)
      sectorMap.set(p.sector, (sectorMap.get(p.sector) ?? 0) + p.size);
    const sectorExposure = [...sectorMap.entries()]
      .map(([sector, sz]) => ({ sector, pct: +((sz / total) * 100).toFixed(1) }))
      .sort((a, b) => b.pct - a.pct);

    const ratingBuckets = ["B+/B", "B/B-", "B-/CCC+", "BB-/B+"];
    const ratingMap = new Map<string, number>();
    for (const p of positions) {
      const rng = seeded(`rating:${p.sector}:${p.leverage}`);
      const r = p.rating ?? pick(rng, ratingBuckets);
      ratingMap.set(r, (ratingMap.get(r) ?? 0) + p.size);
    }
    const ratingExposure = [...ratingMap.entries()]
      .map(([rating, sz]) => ({ rating, pct: +((sz / total) * 100).toFixed(1) }))
      .sort((a, b) => b.pct - a.pct);

    const wl = w((p) => p.leverage);
    return {
      weightedSpreadBps: Math.round(w((p) => p.spreadBps)),
      weightedLeverage: +wl.toFixed(2),
      weightedYieldPct: +w((p) => p.yieldPct).toFixed(2),
      durationYrs: +(2.6 + wl * 0.15).toFixed(1),
      var95Pct: +(1.8 + wl * 0.4).toFixed(1),
      sectorExposure,
      ratingExposure,
    };
  }

  async getDefaultRisk(borrower: string, leverage = 4.5): Promise<DefaultRisk> {
    await this.delay();
    const rng = seeded(`DRSK:${borrower}`);
    const base = Math.max(0.4, (leverage - 2) * 0.85 + rng() * 1.2);
    const oneYr = +base.toFixed(2);
    const ratings = ["BB-", "B+", "B", "B-", "CCC+"];
    const idx = Math.min(
      ratings.length - 1,
      Math.floor((leverage - 3) / 0.8) + Math.floor(rng() * 2),
    );
    return {
      borrower,
      oneYrPdPct: oneYr,
      fiveYrPdPct: +(oneYr * (3.4 + rng())).toFixed(2),
      impliedRating: ratings[Math.max(0, idx)],
      distanceToDefault: +(4.5 - leverage * 0.4 + rng()).toFixed(2),
      trend: pick(rng, ["Improving", "Stable", "Stable", "Deteriorating"]),
    };
  }

  async getCreditProfile(
    borrower: string,
    internalRating = "4",
  ): Promise<CreditProfile> {
    await this.delay();
    const rng = seeded(`CRPR:${borrower}`);
    const scales = ["Ba3", "B1", "B2", "B3", "Caa1"];
    const spScales = ["BB-", "B+", "B", "B-", "CCC+"];
    const base = Math.floor(rng() * 3) + 1;
    return {
      borrower,
      agencyRatings: AGENCIES.map((agency, i) => ({
        agency,
        rating:
          agency === "S&P" ? spScales[Math.min(4, base + i)] : scales[Math.min(4, base + i)],
        outlook: pick(seeded(`${borrower}:${agency}`), [...OUTLOOKS]),
      })),
      internalRating,
      spreadToBenchmarkBps: 30 + Math.floor(rng() * 90),
    };
  }

  async runStructuringScenarios(input: {
    borrower: string;
    spreadBps: number;
    floorBps: number;
    oidPct: number;
    leverage: number;
  }): Promise<StructuringQuote[]> {
    await this.delay();
    const base = 4.35;
    const scenarios: { name: string; ds: number; dl: number }[] = [
      { name: "Base Case", ds: 0, dl: 0 },
      { name: "Tight (lender-friendly −25bps)", ds: -25, dl: -0.2 },
      { name: "Wide (+50bps, +0.5x)", ds: 50, dl: 0.5 },
      { name: "Downside (+100bps, +1.0x)", ds: 100, dl: 1.0 },
    ];
    return scenarios.map((sc) => {
      const spread = input.spreadBps + sc.ds;
      const oid = Math.max(0, input.oidPct + sc.ds / 200);
      const lev = input.leverage + sc.dl;
      const allIn = base + spread / 100 + oid / 4;
      const wal = +(4.2 + lev * 0.12).toFixed(1);
      return {
        scenario: sc.name,
        baseRatePct: base,
        spreadBps: spread,
        floorBps: input.floorBps,
        oidPct: +oid.toFixed(2),
        allInYieldPct: +allIn.toFixed(2),
        waLifeYrs: wal,
        pricePct: +(100 - oid).toFixed(2),
        netLeverage: +lev.toFixed(1),
      };
    });
  }
}

export const bloomberg: BloombergClient = new MockBloombergClient();
