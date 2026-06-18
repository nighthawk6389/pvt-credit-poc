import { db } from "@/lib/db";
import { canSeeDeal, type Role } from "@/lib/auth/roles";
import {
  toParsedDefinition,
  evaluate,
  reconcile,
  deriveCovenantStatus,
  parseSnapshot,
  parseSchedule,
  parseSpringing,
  parseBasket,
  type FactMap,
  type ParsedDefinition,
  type CovenantStatus,
} from "@/lib/covenants";

// ── Helpers ────────────────────────────────────────────────────────────────

/** Group a borrower's FundamentalFacts into per-period fact maps, applying
 *  overrides on top of BBG values. Key = periodEnd ISO. */
async function factsByPeriod(borrowerId: string): Promise<Map<string, FactMap>> {
  const facts = await db.fundamentalFact.findMany({
    where: { borrowerId },
    orderBy: [{ periodEnd: "asc" }, { isOverride: "asc" }],
  });
  const map = new Map<string, FactMap>();
  for (const f of facts) {
    const key = f.periodEnd.toISOString();
    const m = map.get(key) ?? {};
    // overrides sort last ⇒ they win
    m[f.fieldCode] = f.value;
    map.set(key, m);
  }
  return map;
}

export type CovenantPeriodResult = {
  testId: string;
  periodEnd: string;
  testDate: string;
  recomputed: number | null;
  reported: number | null;
  reconDelta: number | null;
  reconDeltaPct: number | null;
  reconFlag: boolean;
  thresholdApplied: number;
  headroomPct: number;
  status: CovenantStatus;
  breakevenEbitda: number | null;
  springingActive: boolean;
  note: string | null;
  inputs: Record<string, number>;
  waived: boolean;
};

export type CovenantSuiteItem = {
  id: string;
  name: string;
  category: string;
  formula: string;
  operator: string;
  unit: string;
  ebitdaBasis: string;
  threshold: number;
  hasSchedule: boolean;
  hasSpringing: boolean;
  hasBasket: boolean;
  source: string | null;
  latest: CovenantPeriodResult | null;
  history: CovenantPeriodResult[];
  reporting: {
    kind: string;
    dueDaysAfter: number;
    deliveries: { periodEnd: string; dueDate: string; deliveredDate: string | null; status: string }[];
  } | null;
};

function evalPeriod(
  parsed: ParsedDefinition,
  facts: FactMap,
  test: {
    id: string;
    periodEnd: Date;
    testDate: Date;
    reportedValue: number | null;
    status: string;
    note: string | null;
  },
  reportingStatus?: string,
): CovenantPeriodResult {
  const periodEnd = test.periodEnd;
  const waived = test.status === "Waived";
  const upcoming = test.status === "Upcoming";

  if (parsed.category === "Reporting") {
    const status = deriveCovenantStatus({
      category: "Reporting",
      reportingStatus,
      recomputed: null,
      thresholdApplied: parsed.threshold,
      operator: parsed.operator,
      headroomPct: 0,
    });
    return {
      testId: test.id, periodEnd: periodEnd.toISOString(), testDate: test.testDate.toISOString(),
      recomputed: null, reported: null, reconDelta: null, reconDeltaPct: null, reconFlag: false,
      thresholdApplied: parsed.threshold, headroomPct: 0, status, breakevenEbitda: null,
      springingActive: true, note: test.note, inputs: {}, waived,
    };
  }

  const res = evaluate(parsed, facts, periodEnd);
  const reported = test.reportedValue;
  const recon =
    !upcoming && res.value != null && reported != null ? reconcile(res.value, reported) : null;
  const status = upcoming
    ? "Upcoming"
    : deriveCovenantStatus({
        category: parsed.category,
        waived,
        springingActive: res.springingActive,
        recomputed: res.value,
        thresholdApplied: res.thresholdApplied,
        operator: parsed.operator,
        headroomPct: res.headroomPct,
        reconFlag: recon?.flag ?? false,
        hasActual: res.value != null,
      });

  return {
    testId: test.id,
    periodEnd: periodEnd.toISOString(),
    testDate: test.testDate.toISOString(),
    recomputed: res.value,
    reported,
    reconDelta: recon?.delta ?? null,
    reconDeltaPct: recon?.deltaPct ?? null,
    reconFlag: recon?.flag ?? false,
    thresholdApplied: res.thresholdApplied,
    headroomPct: res.headroomPct,
    status,
    breakevenEbitda: res.breakevenEbitda,
    springingActive: res.springingActive,
    note: test.note,
    inputs: res.inputs,
    waived,
  };
}

// ── Deep, single-deal suite ─────────────────────────────────────────────────

export async function getCovenantSuite(dealId: string, role: Role) {
  const deal = await db.deal.findUnique({
    where: { id: dealId },
    include: {
      borrower: { include: { financials: { orderBy: { periodEnd: "asc" } } } },
      covenantDefs: {
        orderBy: { createdAt: "asc" },
        include: {
          tests: { orderBy: { periodEnd: "asc" } },
          reportingObligation: { include: { deliveries: { orderBy: { periodEnd: "asc" } } } },
        },
      },
    },
  });
  if (!deal) return { deal: null, blocked: false as const };
  if (!canSeeDeal(role, deal)) return { deal: null, blocked: true as const };

  const periodMap = await factsByPeriod(deal.borrower.id);
  const adjustments = await db.ebitdaAdjustment.findMany({
    where: { borrowerId: deal.borrower.id },
    orderBy: [{ periodEnd: "asc" }, { order: "asc" }],
  });

  const items: CovenantSuiteItem[] = deal.covenantDefs.map((def) => {
    const parsed = toParsedDefinition(def);
    const deliveryByPeriod = new Map(
      (def.reportingObligation?.deliveries ?? []).map((d) => [d.periodEnd.toISOString(), d.status]),
    );
    const history = def.tests.map((t) =>
      evalPeriod(parsed, periodMap.get(t.periodEnd.toISOString()) ?? {}, t, deliveryByPeriod.get(t.periodEnd.toISOString())),
    );
    const realized = history.filter((h) => h.status !== "Upcoming");
    const latest = realized.length ? realized[realized.length - 1] : history[history.length - 1] ?? null;

    return {
      id: def.id,
      name: def.name,
      category: def.category,
      formula: def.formula,
      operator: def.operator,
      unit: def.unit,
      ebitdaBasis: def.ebitdaBasis,
      threshold: def.threshold,
      hasSchedule: !!parseSchedule(def.thresholdSchedule),
      hasSpringing: !!parseSpringing(def.springingCondition),
      hasBasket: !!parseBasket(def.basketConfig),
      source: def.source,
      latest,
      history,
      reporting: def.reportingObligation
        ? {
            kind: def.reportingObligation.kind,
            dueDaysAfter: def.reportingObligation.dueDaysAfter,
            deliveries: def.reportingObligation.deliveries.map((d) => ({
              periodEnd: d.periodEnd.toISOString(),
              dueDate: d.dueDate.toISOString(),
              deliveredDate: d.deliveredDate?.toISOString() ?? null,
              status: d.status,
            })),
          }
        : null,
    };
  });

  // Latest period's add-back bridge.
  const adjPeriods = [...new Set(adjustments.map((a) => a.periodEnd.toISOString()))].sort();
  const latestAdjPeriod = adjPeriods[adjPeriods.length - 1];
  const latestAdjustments = adjustments
    .filter((a) => a.periodEnd.toISOString() === latestAdjPeriod)
    .map((a) => ({
      id: a.id, label: a.label, amount: a.amount, category: a.category,
      capped: a.capped, aggressiveFlag: a.aggressiveFlag, uncapped: a.uncapped, source: a.source,
    }));

  // Per-period fundamental facts for the scenario slider (serialized to client).
  const facts = [...periodMap.entries()]
    .map(([periodEnd, f]) => ({
      periodEnd,
      periodLabel:
        deal.borrower.financials.find((fin) => fin.periodEnd.toISOString() === periodEnd)?.periodLabel ??
        periodEnd.slice(0, 7),
      facts: f,
    }))
    .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));

  return {
    blocked: false as const,
    deal: {
      id: deal.id,
      codeName: deal.codeName,
      borrowerId: deal.borrower.id,
      borrowerName: deal.borrower.name,
    },
    items,
    latestAdjustments,
    latestAdjPeriod: latestAdjPeriod ?? null,
    facts,
  };
}

/** Definition rows + parsed metadata for the definitions editor. */
export async function getDefinitions(dealId: string, role: Role) {
  const suite = await getCovenantSuite(dealId, role);
  return suite;
}

// ── Forecast inputs (parsed defs + per-period facts for the client island) ──

export async function getForecastInputs(dealId: string, role: Role) {
  const deal = await db.deal.findUnique({
    where: { id: dealId },
    include: {
      borrower: { include: { financials: { orderBy: { periodEnd: "asc" } } } },
      covenantDefs: { where: { category: { not: "Reporting" } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!deal) return { blocked: false as const, deal: null };
  if (!canSeeDeal(role, deal)) return { blocked: true as const, deal: null };

  const periodMap = await factsByPeriod(deal.borrower.id);
  const definitions: ParsedDefinition[] = deal.covenantDefs.map((d) => toParsedDefinition(d));

  // Include actual + projected periods. For projected periods (no facts yet),
  // synthesize facts from the financial projection by scaling the latest facts.
  const finByPeriod = new Map(deal.borrower.financials.map((f) => [f.periodEnd.toISOString(), f]));
  const actualPeriods = [...periodMap.keys()].sort();
  const latestActual = actualPeriods[actualPeriods.length - 1];
  const latestFacts = latestActual ? periodMap.get(latestActual)! : {};

  const periods = deal.borrower.financials.map((fin) => {
    const key = fin.periodEnd.toISOString();
    let facts = periodMap.get(key);
    if (!facts) {
      // projected period: scale leverage-relevant fields by EBITDA growth vs latest actual.
      const latestFin = latestActual ? finByPeriod.get(latestActual) : undefined;
      const scale = latestFin && latestFin.ebitda ? fin.ebitda / latestFin.ebitda : 1;
      facts = { ...latestFacts };
      for (const code of ["EBITDA", "EBITDA_ADJ", "SALES_REV_TURN"]) {
        if (facts[code] != null) facts[code] = +(facts[code] * scale).toFixed(1);
      }
      // net debt eases as EBITDA grows (modest deleveraging)
      if (facts.TOT_DEBT != null) facts.TOT_DEBT = +(facts.TOT_DEBT * (1 - (scale - 1) * 0.3)).toFixed(1);
    }
    return { periodEnd: key, periodLabel: fin.periodLabel, facts, isProjected: !fin.isActual };
  });

  return {
    blocked: false as const,
    deal: { id: deal.id, codeName: deal.codeName, borrowerName: deal.borrower.name },
    definitions,
    periods,
  };
}

// ── Compliance pack ──────────────────────────────────────────────────────────

export async function getCompliancePack(dealId: string, role: Role) {
  const suite = await getCovenantSuite(dealId, role);
  if (suite.blocked || !suite.deal) return suite;
  // Attach the formula snapshot from the persisted test for the math display.
  const tests = await db.covenantDefTest.findMany({
    where: { definition: { dealId } },
  });
  const snapshotByTest = new Map(tests.map((t) => [t.id, parseSnapshot(t.formulaSnapshot)]));
  return { ...suite, snapshotByTest };
}

// ── Portfolio board ──────────────────────────────────────────────────────────

export type BoardRow = {
  dealId: string;
  borrowerId: string;
  deal: string;
  borrower: string;
  sector: string;
  covenants: { name: string; category: string; status: string; headroomPct: number | null }[];
  worstStatus: string;
  minHeadroom: number | null;
  reconFlags: number;
  reportingLate: number;
};

const STATUS_SEVERITY: Record<string, number> = {
  Breach: 5, Missing: 5, Late: 4, "Recon-flag": 3, "Near-breach": 2,
  Pass: 0, Waived: 1, Upcoming: 0, "N/A-springing": 0, Delivered: 0, Pending: 0,
};

export async function getCovenantBoard(role: Role) {
  // Use persisted def-tests for speed (no per-deal live evaluation).
  const defs = await db.covenantDefinition.findMany({
    include: {
      deal: { include: { borrower: true } },
      tests: { orderBy: { periodEnd: "desc" } },
      reportingObligation: { include: { deliveries: { orderBy: { periodEnd: "desc" } } } },
    },
  });

  const byDeal = new Map<string, BoardRow>();
  for (const def of defs) {
    if (!canSeeDeal(role, def.deal)) continue;
    const key = def.dealId;
    let row = byDeal.get(key);
    if (!row) {
      row = {
        dealId: def.dealId,
        borrowerId: def.deal.borrower.id,
        deal: def.deal.codeName,
        borrower: def.deal.borrower.name,
        sector: def.deal.borrower.sector,
        covenants: [],
        worstStatus: "Pass",
        minHeadroom: null,
        reconFlags: 0,
        reportingLate: 0,
      };
      byDeal.set(key, row);
    }
    const realized = def.tests.find((t) => t.status !== "Upcoming");
    let status = realized?.status ?? "Upcoming";
    let headroom = realized?.headroomPct ?? null;
    if (def.category === "Reporting") {
      const latestDelivery = def.reportingObligation?.deliveries.find((d) => d.status !== "Pending");
      status = latestDelivery?.status === "Late" ? "Late" : latestDelivery?.status === "Missing" ? "Missing" : "Pass";
      headroom = null;
    }
    row.covenants.push({ name: def.name, category: def.category, status, headroomPct: headroom });
    if (status === "Recon-flag") row.reconFlags += 1;
    if (status === "Late" || status === "Missing") row.reportingLate += 1;
    if ((STATUS_SEVERITY[status] ?? 0) > (STATUS_SEVERITY[row.worstStatus] ?? 0)) row.worstStatus = status;
    if (headroom != null && (row.minHeadroom == null || headroom < row.minHeadroom)) row.minHeadroom = headroom;
  }

  const rows = [...byDeal.values()].sort(
    (a, b) => (STATUS_SEVERITY[b.worstStatus] ?? 0) - (STATUS_SEVERITY[a.worstStatus] ?? 0),
  );

  return {
    rows,
    stats: {
      deals: rows.length,
      breaches: rows.filter((r) => r.worstStatus === "Breach").length,
      nearBreaches: rows.filter((r) => r.worstStatus === "Near-breach").length,
      reconFlags: rows.reduce((s, r) => s + r.reconFlags, 0),
      reportingLate: rows.reduce((s, r) => s + r.reportingLate, 0),
    },
  };
}
