import { PrismaClient } from "@prisma/client";
import {
  parse,
  collectFields,
  toParsedDefinition,
  evaluate,
  reconcile,
  deriveCovenantStatus,
  toJson,
  type ThresholdStep,
} from "../src/lib/covenants/index";

const db = new PrismaClient();

// Deterministic RNG so reruns produce identical data.
function makeRng(seedStr: string) {
  let s = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    s ^= seedStr.charCodeAt(i);
    s = Math.imul(s, 16777619);
  }
  s >>>= 0;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0xffffffff;
  };
}

const D = (y: number, m: number, d = 15, h = 0) =>
  new Date(Date.UTC(y, m - 1, d, h));
const QUARTER_ENDS = [
  { label: "Q1 2024", y: 2024, m: 3 },
  { label: "Q2 2024", y: 2024, m: 6 },
  { label: "Q3 2024", y: 2024, m: 9 },
  { label: "Q4 2024", y: 2024, m: 12 },
  { label: "Q1 2025", y: 2025, m: 3 },
  { label: "Q2 2025", y: 2025, m: 6 },
  { label: "Q3 2025", y: 2025, m: 9 },
  { label: "Q4 2025", y: 2025, m: 12 },
];

async function main() {
  console.log("⟳ Resetting tables…");
  // Order matters for FK constraints.
  await db.activityLog.deleteMany();
  await db.reportingDelivery.deleteMany();
  await db.reportingObligation.deleteMany();
  await db.covenantDefTest.deleteMany();
  await db.covenantDefinition.deleteMany();
  await db.ebitdaAdjustment.deleteMany();
  await db.fundamentalFact.deleteMany();
  await db.iCVote.deleteMany();
  await db.note.deleteMany();
  await db.task.deleteMany();
  await db.lifecycleEvent.deleteMany();
  await db.cashFlowSchedule.deleteMany();
  await db.covenantTest.deleteMany();
  await db.covenant.deleteMany();
  await db.creditMemo.deleteMany();
  await db.dDQItem.deleteMany();
  await db.document.deleteMany();
  await db.folder.deleteMany();
  await db.dealTeamMember.deleteMany();
  await db.valuation.deleteMany();
  await db.financialStatement.deleteMany();
  await db.facility.deleteMany();
  await db.deal.deleteMany();
  await db.borrower.deleteMany();
  await db.sponsor.deleteMany();

  console.log("→ Sponsors");
  const sponsorData = [
    { name: "Brightwater Capital", type: "PE", aum: 14200, hqCity: "New York, NY", relationshipOwner: "Jordan Mercer", vintage: 2008 },
    { name: "Crestline Partners", type: "PE", aum: 8600, hqCity: "Chicago, IL", relationshipOwner: "Avery Patel", vintage: 2011 },
    { name: "Summit Ridge Equity", type: "PE", aum: 5400, hqCity: "Boston, MA", relationshipOwner: "Riley Chen", vintage: 2014 },
    { name: "Halyard Capital", type: "PE", aum: 3100, hqCity: "Dallas, TX", relationshipOwner: "Jordan Mercer", vintage: 2016 },
    { name: "Tidewater PE", type: "PE", aum: 2200, hqCity: "Atlanta, GA", relationshipOwner: "Avery Patel", vintage: 2017 },
    { name: "Granite Peak Partners", type: "Family Office", aum: 1800, hqCity: "Denver, CO", relationshipOwner: "Riley Chen", vintage: 2013 },
  ];
  const sponsors: Record<string, string> = {};
  for (const s of sponsorData) {
    const created = await db.sponsor.create({ data: s });
    sponsors[s.name] = created.id;
  }

  // ── Supporting portfolio book ──────────────────────────────────────────
  type Row = {
    name: string; sector: string; city: string; sponsor: string;
    size: number; spread: number; leverage: number; ebitda: number;
    stage: string; status: string; rating: string; trend: string; watch: boolean;
    facType: string; ceo: string; desc: string;
  };
  const book: Row[] = [
    { name: "Cascade Software Group", sector: "Software", city: "Austin, TX", sponsor: "Brightwater Capital", size: 120, spread: 600, leverage: 5.1, ebitda: 28, stage: "Closed", status: "Active", rating: "4", trend: "Stable", watch: false, facType: "Unitranche", ceo: "Dana Whitfield", desc: "Vertical SaaS for field-services businesses." },
    { name: "Ironclad Industrial", sector: "Industrials", city: "Cleveland, OH", sponsor: "Crestline Partners", size: 95, spread: 550, leverage: 3.8, ebitda: 31, stage: "Closed", status: "Active", rating: "5", trend: "Deteriorating", watch: true, facType: "First Lien TL", ceo: "Marcus Hale", desc: "Precision-engineered industrial components." },
    { name: "Verde Facilities Services", sector: "Business Services", city: "Phoenix, AZ", sponsor: "Tidewater PE", size: 70, spread: 625, leverage: 4.6, ebitda: 18, stage: "Closed", status: "Active", rating: "4", trend: "Stable", watch: false, facType: "Unitranche", ceo: "Lena Ortiz", desc: "Outsourced commercial facilities management." },
    { name: "Northstar Logistics", sector: "Transportation", city: "Memphis, TN", sponsor: "Brightwater Capital", size: 140, spread: 525, leverage: 4.2, ebitda: 38, stage: "Closed", status: "Active", rating: "3", trend: "Improving", watch: false, facType: "Unitranche", ceo: "Priya Raman", desc: "Asset-light regional freight & 3PL." },
    { name: "Sterling Dental Management", sector: "Healthcare Services", city: "Charlotte, NC", sponsor: "Summit Ridge Equity", size: 88, spread: 575, leverage: 4.9, ebitda: 22, stage: "Closed", status: "Active", rating: "5", trend: "Deteriorating", watch: true, facType: "Unitranche", ceo: "Dr. Alan Pierce", desc: "Multi-state dental support organization." },
    { name: "Apex Specialty Chemicals", sector: "Chemicals", city: "Houston, TX", sponsor: "Halyard Capital", size: 110, spread: 500, leverage: 3.5, ebitda: 34, stage: "Closed", status: "Active", rating: "3", trend: "Stable", watch: false, facType: "First Lien TL", ceo: "Grace Lin", desc: "Specialty additives for coatings & adhesives." },
    { name: "BlueRidge SaaS", sector: "Software", city: "Raleigh, NC", sponsor: "Crestline Partners", size: 65, spread: 650, leverage: 5.4, ebitda: 15, stage: "IC", status: "Active", rating: "5", trend: "Stable", watch: false, facType: "Unitranche", ceo: "Theo Novak", desc: "Compliance automation software for mid-market." },
    { name: "Granite Building Products", sector: "Building Products", city: "Minneapolis, MN", sponsor: "Granite Peak Partners", size: 130, spread: 475, leverage: 3.2, ebitda: 45, stage: "Closed", status: "Active", rating: "3", trend: "Improving", watch: false, facType: "First Lien TL", ceo: "Owen Brady", desc: "Engineered building & insulation products." },
    { name: "Harbor Point Insurance Services", sector: "Insurance Services", city: "Hartford, CT", sponsor: "Summit Ridge Equity", size: 105, spread: 550, leverage: 4.0, ebitda: 27, stage: "Closed", status: "Active", rating: "3", trend: "Stable", watch: false, facType: "Unitranche", ceo: "Maya Fisher", desc: "Specialty MGA & insurance brokerage." },
    { name: "Tempo Fitness", sector: "Consumer", city: "San Diego, CA", sponsor: "Tidewater PE", size: 55, spread: 700, leverage: 5.8, ebitda: 12, stage: "Diligence", status: "Active", rating: "6", trend: "Deteriorating", watch: true, facType: "Unitranche", ceo: "Chris Donnelly", desc: "Boutique fitness studio franchisor." },
    { name: "Vanguard Aerospace", sector: "Aerospace & Defense", city: "Wichita, KS", sponsor: "Halyard Capital", size: 160, spread: 525, leverage: 4.3, ebitda: 48, stage: "Closed", status: "Active", rating: "3", trend: "Stable", watch: false, facType: "First Lien TL", ceo: "Sandra Cole", desc: "Aftermarket aerospace components & MRO." },
    { name: "Pinnacle Veterinary Group", sector: "Healthcare Services", city: "Nashville, TN", sponsor: "Brightwater Capital", size: 78, spread: 600, leverage: 5.0, ebitda: 19, stage: "Closed", status: "Active", rating: "4", trend: "Stable", watch: false, facType: "Unitranche", ceo: "Dr. Nina Park", desc: "Consolidator of veterinary clinics." },
    { name: "Lattice Data Centers", sector: "Infrastructure", city: "Reno, NV", sponsor: "Crestline Partners", size: 175, spread: 450, leverage: 4.7, ebitda: 52, stage: "Closed", status: "Active", rating: "3", trend: "Improving", watch: false, facType: "First Lien TL", ceo: "Victor Shaw", desc: "Edge & colocation data-center operator." },
    { name: "Redwood Restaurants", sector: "Consumer", city: "Portland, OR", sponsor: "Tidewater PE", size: 60, spread: 725, leverage: 6.1, ebitda: 11, stage: "Closed", status: "On Hold", rating: "7", trend: "Deteriorating", watch: true, facType: "Unitranche", ceo: "Hannah Reyes", desc: "Fast-casual restaurant platform." },
  ];

  console.log("→ Borrowers + facilities + financials + valuations + deals");
  let dealCounter = 0;
  for (const row of book) {
    const rng = makeRng(row.name);
    const borrower = await db.borrower.create({
      data: {
        name: row.name,
        sector: row.sector,
        hqCity: row.city,
        description: row.desc,
        ceo: row.ceo,
        founded: 1995 + Math.floor(rng() * 22),
        sponsorId: sponsors[row.sponsor],
        riskRating: row.rating,
        riskTrend: row.trend,
        watchlist: row.watch,
      },
    });

    // Two trailing financial periods for the portfolio view.
    for (const q of QUARTER_ENDS.slice(-3)) {
      const drift = 1 + (rng() - 0.4) * 0.06;
      const ebitda = +(row.ebitda * drift).toFixed(1);
      const revenue = +(ebitda / (0.18 + rng() * 0.1)).toFixed(1);
      await db.financialStatement.create({
        data: {
          borrowerId: borrower.id,
          periodEnd: D(q.y, q.m, 30),
          periodLabel: q.label,
          periodType: "Q",
          revenue,
          ebitda,
          ebitdaMargin: +((ebitda / revenue) * 100).toFixed(1),
          netLeverage: +(row.leverage + (rng() - 0.5) * 0.3).toFixed(2),
          interestCoverage: +(2.6 - row.leverage * 0.18 + rng() * 0.3).toFixed(2),
          liquidity: +(8 + rng() * 25).toFixed(1),
          capex: +(revenue * 0.03).toFixed(1),
          fcf: +(ebitda * 0.55).toFixed(1),
          isActual: true,
        },
      });
    }

    const deal = await db.deal.create({
      data: {
        codeName: `Project ${["Helios", "Vega", "Orion", "Lyra", "Draco", "Nova", "Cygnus", "Polaris", "Rigel", "Antares", "Mira", "Castor", "Pollux", "Electra"][dealCounter++]}`,
        borrowerId: borrower.id,
        sponsorId: sponsors[row.sponsor],
        stage: row.stage,
        status: row.status,
        facilityType: row.facType,
        dealSize: row.size,
        useOfProceeds: "LBO / refinancing & growth capital",
        targetClose: D(2025, 1 + Math.floor(rng() * 11)),
        leadName: sponsorData.find((s) => s.name === row.sponsor)?.relationshipOwner,
        probability: row.stage === "Closed" ? 100 : 40 + Math.floor(rng() * 40),
        isPrivileged: row.stage !== "Closed",
        thesis: `${row.desc} ${row.facType} supporting a sponsor-led platform in ${row.sector.toLowerCase()}.`,
      },
    });

    await db.facility.create({
      data: {
        dealId: deal.id,
        borrowerId: borrower.id,
        name: `${row.facType} Facility`,
        type: row.facType === "Unitranche" ? "Unitranche" : "FirstLienTL",
        seniority: "First Lien",
        commitment: row.size,
        funded: row.stage === "Closed" ? row.size * (0.85 + rng() * 0.15) : 0,
        spreadBps: row.spread,
        floorBps: 100,
        oidPct: +(0.5 + rng() * 1.5).toFixed(2),
        upfrontFeeBps: 200 + Math.floor(rng() * 100),
        maturity: D(2030, 1 + Math.floor(rng() * 11)),
      },
    });

    // Valuation for closed positions.
    if (row.stage === "Closed") {
      const mark = row.watch ? 92 + rng() * 5 : 98 + rng() * 2.5;
      await db.valuation.create({
        data: {
          borrowerId: borrower.id,
          asOf: D(2025, 12, 31),
          method: "Yield",
          fairValuePct: +mark.toFixed(2),
          fairValueAmt: +((mark / 100) * row.size).toFixed(1),
          costBasis: row.size,
          discountRate: +(row.spread / 100 + 4.35).toFixed(2),
          status: "Final",
          note: row.watch ? "Marked below par on deteriorating credit metrics." : "At/near par; performing.",
        },
      });
    }

    // A couple of covenants + recent tests so the cross-portfolio calendar fills.
    if (row.stage === "Closed" || row.stage === "IC") {
      const lev = await db.covenant.create({
        data: {
          dealId: deal.id,
          name: "Total Net Leverage",
          type: "Maintenance",
          operator: "<=",
          threshold: +(row.leverage + 1.0).toFixed(2),
          unit: "x",
        },
      });
      const cov = await db.covenant.create({
        data: {
          dealId: deal.id,
          name: "Fixed Charge Coverage",
          type: "Maintenance",
          operator: ">=",
          threshold: 1.5,
          unit: "x",
        },
      });
      for (const q of QUARTER_ENDS.slice(-2)) {
        const actualLev = +(row.leverage + (rng() - 0.5) * 0.4).toFixed(2);
        const threshLev = row.leverage + 1.0;
        const breach = actualLev > threshLev;
        await db.covenantTest.create({
          data: {
            covenantId: lev.id,
            periodEnd: D(q.y, q.m, 30),
            testDate: D(q.y, q.m + 1 > 12 ? 1 : q.m + 1, 15),
            actual: actualLev,
            headroomPct: +(((threshLev - actualLev) / threshLev) * 100).toFixed(1),
            status: breach ? "Breach" : "Pass",
            note: breach ? "Leverage covenant breach — waiver under discussion." : null,
          },
        });
        const fccr = +(2.4 - row.leverage * 0.16 + rng() * 0.2).toFixed(2);
        await db.covenantTest.create({
          data: {
            covenantId: cov.id,
            periodEnd: D(q.y, q.m, 30),
            testDate: D(q.y, q.m + 1 > 12 ? 1 : q.m + 1, 15),
            actual: fccr,
            headroomPct: +(((fccr - 1.5) / 1.5) * 100).toFixed(1),
            status: fccr < 1.5 ? "Breach" : "Pass",
          },
        });
      }
      // One upcoming test for the calendar.
      await db.covenantTest.create({
        data: {
          covenantId: lev.id,
          periodEnd: D(2026, 3, 31),
          testDate: D(2026, 4, 15),
          status: "Upcoming",
        },
      });
    }

    // A restructuring event for the distressed name.
    if (row.status === "On Hold") {
      await db.lifecycleEvent.create({
        data: {
          dealId: deal.id,
          type: "Restructuring",
          title: "Forbearance agreement executed",
          detail: "30-day forbearance while the sponsor evaluates a new-money injection.",
          amount: null,
          status: "Executed",
          effectiveDate: D(2026, 2, 10),
          createdBy: "Jordan Mercer",
        },
      });
    }
  }

  await seedFlagship(sponsors);

  const counts = {
    sponsors: await db.sponsor.count(),
    borrowers: await db.borrower.count(),
    deals: await db.deal.count(),
    documents: await db.document.count(),
    covenantTests: await db.covenantTest.count(),
  };
  console.log("✓ Seed complete:", counts);
}

// ── Flagship deal: Project Atlas / Meridian Health Partners ──────────────
async function seedFlagship(sponsors: Record<string, string>) {
  console.log("→ Flagship: Project Atlas (Meridian Health Partners)");
  const borrower = await db.borrower.create({
    data: {
      name: "Meridian Health Partners",
      sector: "Healthcare Services",
      hqCity: "Columbus, OH",
      website: "meridianhealthpartners.com",
      ceo: "Dr. Elena Vance",
      founded: 2009,
      description:
        "Physician-led, multi-specialty outpatient care platform operating 64 clinics across the Midwest, with ~80% contracted/recurring revenue and a proven de novo + M&A growth model.",
      sponsorId: sponsors["Brightwater Capital"],
      riskRating: "3",
      riskTrend: "Stable",
      watchlist: false,
    },
  });

  // 8 quarters actual + 4 projected.
  const baseEbitda = 36;
  for (let i = 0; i < QUARTER_ENDS.length; i++) {
    const q = QUARTER_ENDS[i];
    const ebitda = +(baseEbitda * (1 + i * 0.022)).toFixed(1);
    const revenue = +(ebitda / 0.205).toFixed(1);
    await db.financialStatement.create({
      data: {
        borrowerId: borrower.id,
        periodEnd: D(q.y, q.m, 30),
        periodLabel: q.label,
        periodType: "Q",
        revenue,
        ebitda,
        ebitdaMargin: +((ebitda / revenue) * 100).toFixed(1),
        netLeverage: +(4.9 - i * 0.07).toFixed(2),
        interestCoverage: +(1.9 + i * 0.03).toFixed(2),
        liquidity: +(18 + i * 1.4).toFixed(1),
        capex: +(revenue * 0.028).toFixed(1),
        fcf: +(ebitda * 0.58).toFixed(1),
        isActual: true,
      },
    });
  }
  // Projected 2026 quarters.
  const proj = [
    { label: "Q1 2026", y: 2026, m: 3 },
    { label: "Q2 2026", y: 2026, m: 6 },
    { label: "Q3 2026", y: 2026, m: 9 },
    { label: "Q4 2026", y: 2026, m: 12 },
  ];
  for (let i = 0; i < proj.length; i++) {
    const q = proj[i];
    const ebitda = +(42 * (1 + (i + 1) * 0.025)).toFixed(1);
    const revenue = +(ebitda / 0.21).toFixed(1);
    await db.financialStatement.create({
      data: {
        borrowerId: borrower.id,
        periodEnd: D(q.y, q.m, 30),
        periodLabel: q.label,
        periodType: "Q",
        revenue,
        ebitda,
        ebitdaMargin: +((ebitda / revenue) * 100).toFixed(1),
        netLeverage: +(4.3 - i * 0.12).toFixed(2),
        interestCoverage: +(2.1 + i * 0.05).toFixed(2),
        liquidity: +(33 + i * 2).toFixed(1),
        capex: +(revenue * 0.028).toFixed(1),
        fcf: +(ebitda * 0.6).toFixed(1),
        isActual: false,
      },
    });
  }

  const deal = await db.deal.create({
    data: {
      codeName: "Project Atlas",
      borrowerId: borrower.id,
      sponsorId: sponsors["Brightwater Capital"],
      stage: "IC",
      status: "Active",
      facilityType: "Unitranche",
      dealSize: 185,
      useOfProceeds:
        "Finance Brightwater's acquisition of Meridian Health Partners; refinance existing debt and fund a $25MM delayed-draw acquisition line.",
      targetClose: D(2026, 7, 31),
      leadName: "Jordan Mercer",
      probability: 75,
      isPrivileged: true,
      thesis:
        "Defensive, recurring-revenue healthcare services platform with a fragmented market, strong sponsor, and ~50% equity cushion. First-lien unitranche at a ~4.4x attachment with quarterly maintenance covenants and an ~11% all-in yield.",
    },
  });

  // Facilities (capital structure).
  await db.facility.createMany({
    data: [
      { dealId: deal.id, borrowerId: borrower.id, name: "First Lien Unitranche", type: "Unitranche", seniority: "First Lien", commitment: 160, funded: 0, spreadBps: 575, floorBps: 100, oidPct: 1.0, pikBps: 0, upfrontFeeBps: 250, maturity: D(2031, 7), order: 0 },
      { dealId: deal.id, borrowerId: borrower.id, name: "Delayed-Draw Term Loan (Acq.)", type: "DelayedDraw", seniority: "First Lien", commitment: 25, funded: 0, spreadBps: 575, floorBps: 100, oidPct: 1.0, pikBps: 0, upfrontFeeBps: 250, maturity: D(2031, 7), order: 1 },
      { dealId: deal.id, borrowerId: borrower.id, name: "Revolving Credit Facility", type: "Revolver", seniority: "First Lien", commitment: 15, funded: 0, spreadBps: 550, floorBps: 100, oidPct: 0, pikBps: 0, upfrontFeeBps: 50, maturity: D(2031, 7), order: 2 },
    ],
  });

  // Team (wall-crossed deal team).
  await db.dealTeamMember.createMany({
    data: [
      { dealId: deal.id, name: "Jordan Mercer", title: "Managing Director", role: "Deal Lead", wallCrossed: true, crossedAt: D(2026, 4, 2) },
      { dealId: deal.id, name: "Avery Patel", title: "Senior Analyst", role: "Analyst", wallCrossed: true, crossedAt: D(2026, 4, 2) },
      { dealId: deal.id, name: "Riley Chen", title: "Partner, IC", role: "IC Member", wallCrossed: true, crossedAt: D(2026, 4, 5) },
      { dealId: deal.id, name: "Sam Okafor", title: "Compliance Officer", role: "Compliance", wallCrossed: true, crossedAt: D(2026, 4, 1) },
    ],
  });

  // Data room: folders + documents with extractable bodyText for AI Q&A.
  const folderDefs = [
    { name: "01 — Confidential Information Memorandum", order: 0 },
    { name: "02 — Financial Statements & Model", order: 1 },
    { name: "03 — Legal & Corporate", order: 2 },
    { name: "04 — Commercial Due Diligence", order: 3 },
    { name: "05 — Management Presentations", order: 4 },
  ];
  const folderIds: Record<string, string> = {};
  for (const f of folderDefs) {
    const created = await db.folder.create({ data: { dealId: deal.id, ...f } });
    folderIds[f.name] = created.id;
  }

  const docs: {
    folder: string; name: string; kind: string; fileType: string; sizeKb: number;
    privilege: string; body: string; by: string;
  }[] = [
    { folder: folderDefs[0].name, name: "Meridian Health — CIM (Project Atlas).pdf", kind: "CIM", fileType: "pdf", sizeKb: 8420, privilege: "Deal Team", by: "Brightwater Capital", body: "Meridian Health Partners is a physician-led multi-specialty outpatient platform operating 64 clinics across Ohio, Indiana, and Michigan. Approximately 80% of revenue is contracted or recurring under multi-year payor agreements, with gross retention above 95%. The Company has grown LTM EBITDA at a mid-teens organic rate complemented by a disciplined de novo and tuck-in acquisition strategy. Management is led by CEO Dr. Elena Vance and is equity-aligned alongside sponsor Brightwater Capital. The transaction contemplates a $185 million first-lien unitranche financing, including a $25 million delayed-draw term loan to fund a near-term acquisition pipeline." },
    { folder: folderDefs[0].name, name: "Investment Highlights Summary.pdf", kind: "CIM", fileType: "pdf", sizeKb: 640, privilege: "Deal Team", by: "Brightwater Capital", body: "Key investment highlights: (1) defensive, non-discretionary healthcare demand; (2) ~80% recurring revenue with high retention; (3) fragmented market supporting consolidation; (4) experienced, aligned management; (5) ~50% sponsor equity cushion to our first-lien attachment point at approximately 4.4x net leverage." },
    { folder: folderDefs[1].name, name: "Audited Financials FY2023-FY2025.xlsx", kind: "Financials", fileType: "xlsx", sizeKb: 2240, privilege: "Deal Team", by: "Avery Patel", body: "Audited financials show revenue growing from $148M to $205M over the period with EBITDA margins expanding from 19.4% to 20.5%. Net leverage at close is approximately 4.4x through the unitranche with interest coverage of 2.1x. Free cash flow conversion is roughly 58% of EBITDA after maintenance capex of ~2.8% of revenue." },
    { folder: folderDefs[1].name, name: "LBO Model — Base & Downside.xlsx", kind: "Model", fileType: "xlsx", sizeKb: 3180, privilege: "Deal Team", by: "Avery Patel", body: "The base case projects de-leveraging of ~0.5x per annum, reaching ~2.8x by year three. The downside case applies a 20% EBITDA decline in year one; under this scenario the borrower maintains compliance with the 5.75x total net leverage covenant with approximately 12% headroom, and interest coverage remains above 1.5x." },
    { folder: folderDefs[1].name, name: "Quality of Earnings Report.pdf", kind: "DDReport", fileType: "pdf", sizeKb: 4120, privilege: "Deal Team", by: "Cendrel Advisory", body: "The Quality of Earnings analysis supports management's adjusted EBITDA with limited add-backs. Pro forma adjustments relate primarily to run-rate savings from completed acquisitions and non-recurring legal costs. Net working capital is stable; no significant revenue-recognition concerns were identified." },
    { folder: folderDefs[2].name, name: "Draft Credit Agreement.pdf", kind: "LegalDocs", fileType: "pdf", sizeKb: 5610, privilege: "IC", by: "Wexler & Crane LLP", body: "The credit agreement provides for a first-lien unitranche facility of $160 million, a $25 million delayed-draw term loan, and a $15 million revolving credit facility. Financial covenants include a maximum total net leverage ratio of 5.75x tested quarterly, a minimum fixed charge coverage ratio of 1.50x, and minimum liquidity of $10 million. The agreement includes a 50% excess cash flow sweep stepping down at 4.0x and 3.5x, MFN protection of 75 bps with a 12-month sunset, and limited incremental capacity of the greater of $40 million and 100% of EBITDA." },
    { folder: folderDefs[2].name, name: "Corporate Structure Chart.pdf", kind: "LegalDocs", fileType: "pdf", sizeKb: 320, privilege: "Deal Team", by: "Wexler & Crane LLP", body: "The borrower is a Delaware holding company with operating subsidiaries in three states. All material subsidiaries are guarantors and the facility is secured by a first-priority lien on substantially all assets." },
    { folder: folderDefs[3].name, name: "Commercial DD — Market Study.pdf", kind: "DDReport", fileType: "pdf", sizeKb: 3890, privilege: "Deal Team", by: "Northpoint Strategy", body: "The outpatient care market is growing at approximately 7% annually, driven by a shift of procedures to lower-cost ambulatory settings. Meridian holds top-three share in its core metros. Payor concentration is moderate, with the top three payors representing approximately 38% of revenue under multi-year contracts." },
    { folder: folderDefs[3].name, name: "Payor Contract Summary.xlsx", kind: "DDReport", fileType: "xlsx", sizeKb: 410, privilege: "Deal Team", by: "Avery Patel", body: "The top ten payor contracts have a weighted-average remaining term of 3.2 years with automatic renewal provisions. Reimbursement rates are contractually fixed with annual escalators tied to CPI." },
    { folder: folderDefs[4].name, name: "Management Presentation.pdf", kind: "CIM", fileType: "pdf", sizeKb: 6240, privilege: "Deal Team", by: "Meridian Management", body: "Management presented a three-year plan targeting expansion into two adjacent metros, eight de novo clinics, and four tuck-in acquisitions funded by the delayed-draw term loan. The plan assumes mid-teens revenue growth and 50–75 bps of annual margin expansion from scale and procurement." },
    { folder: folderDefs[4].name, name: "Management Call Notes — May 14.docx", kind: "Other", fileType: "docx", sizeKb: 120, privilege: "Deal Team", by: "Avery Patel", body: "On the May 14 management call, the CEO confirmed the acquisition pipeline and addressed payor concentration. The CFO walked through working-capital seasonality and confirmed the maintenance capex budget. No material adverse items were disclosed." },
  ];
  let firstDocId = "";
  for (const d of docs) {
    const created = await db.document.create({
      data: {
        dealId: deal.id,
        folderId: folderIds[d.folder],
        name: d.name,
        kind: d.kind,
        fileType: d.fileType,
        sizeKb: d.sizeKb,
        privilege: d.privilege,
        bodyText: d.body,
        uploadedBy: d.by,
        uploadedAt: D(2026, 4, 10 + Math.floor(Math.random() * 10)),
      },
    });
    if (!firstDocId) firstDocId = created.id;
  }

  // DDQ checklist (24 items, mixed statuses).
  const ddq: { cat: string; q: string; status: string; answer?: string; who: string }[] = [
    { cat: "Commercial", q: "Confirm top-10 customer concentration and contract tenor", status: "Cleared", answer: "Top 10 < 25%; WA remaining term 3.2 yrs.", who: "Avery Patel" },
    { cat: "Commercial", q: "Validate market growth rate and competitive position", status: "Cleared", answer: "~7% market CAGR; top-3 share in core metros.", who: "Avery Patel" },
    { cat: "Commercial", q: "Assess payor mix and reimbursement risk", status: "In Review", who: "Avery Patel" },
    { cat: "Commercial", q: "Review de novo clinic ramp economics", status: "Open", who: "Avery Patel" },
    { cat: "Commercial", q: "Pipeline of acquisition targets for DDTL", status: "In Review", who: "Jordan Mercer" },
    { cat: "Financial", q: "Reconcile management EBITDA to QoE adjusted EBITDA", status: "Cleared", answer: "QoE supports adj. EBITDA; limited add-backs.", who: "Avery Patel" },
    { cat: "Financial", q: "Stress test downside leverage & covenant headroom", status: "Cleared", answer: "20% EBITDA decline → 12% covenant headroom.", who: "Avery Patel" },
    { cat: "Financial", q: "Confirm maintenance vs growth capex split", status: "Cleared", answer: "Maint. capex ~2.8% of revenue.", who: "Avery Patel" },
    { cat: "Financial", q: "Review net working capital seasonality", status: "In Review", who: "Avery Patel" },
    { cat: "Financial", q: "Validate FCF conversion assumptions", status: "Cleared", answer: "~58% of EBITDA.", who: "Avery Patel" },
    { cat: "Financial", q: "Assess revenue recognition policies", status: "Cleared", answer: "No material concerns per QoE.", who: "Cendrel Advisory" },
    { cat: "Legal", q: "Review draft credit agreement covenant package", status: "In Review", who: "Wexler & Crane" },
    { cat: "Legal", q: "Confirm guarantor coverage & collateral", status: "Cleared", answer: "All material subs guarantee; first-lien all-asset.", who: "Wexler & Crane" },
    { cat: "Legal", q: "Litigation & regulatory review (healthcare)", status: "In Review", who: "Wexler & Crane" },
    { cat: "Legal", q: "Confirm MFN and incremental capacity terms", status: "Open", who: "Jordan Mercer" },
    { cat: "Legal", q: "Verify corporate structure & lien priority", status: "Cleared", answer: "DE holdco; first-priority lien confirmed.", who: "Wexler & Crane" },
    { cat: "Management", q: "Background checks on key executives", status: "Cleared", answer: "Completed, no issues.", who: "Sam Okafor" },
    { cat: "Management", q: "Assess depth of management bench", status: "In Review", who: "Jordan Mercer" },
    { cat: "Management", q: "Confirm management equity rollover & alignment", status: "Cleared", answer: "Mgmt rolling ~20% of equity.", who: "Jordan Mercer" },
    { cat: "Management", q: "Review compensation & retention plans", status: "Open", who: "Jordan Mercer" },
    { cat: "ESG", q: "Patient safety & quality metrics review", status: "Cleared", answer: "Above-benchmark quality scores.", who: "Avery Patel" },
    { cat: "ESG", q: "Data privacy / HIPAA compliance posture", status: "In Review", who: "Sam Okafor" },
    { cat: "Financial", q: "Confirm pro forma capitalization & sources/uses", status: "Cleared", answer: "Tied out to model & term sheet.", who: "Avery Patel" },
    { cat: "Legal", q: "Flag: change-of-control & assignment provisions", status: "Flag", answer: "CoC consent thresholds need negotiation.", who: "Wexler & Crane" },
  ];
  await db.dDQItem.createMany({
    data: ddq.map((d, i) => ({
      dealId: deal.id,
      category: d.cat,
      question: d.q,
      status: d.status,
      answer: d.answer ?? null,
      assignee: d.who,
      order: i,
    })),
  });

  // Credit memo (6 sections).
  const sections = [
    { key: "thesis", title: "Investment Thesis", body: "Meridian is a defensive, recurring-revenue healthcare services platform led by an experienced, aligned management team and backed by Brightwater Capital. We propose a first-lien unitranche at a ~4.4x attachment with ~50% equity cushion, quarterly maintenance covenants, and an ~11% all-in yield." },
    { key: "business", title: "Business Overview", body: "64 outpatient clinics across three Midwest states; ~80% contracted/recurring revenue; top-3 share in core metros; growth via de novo expansion and tuck-in M&A funded by a $25MM delayed-draw line." },
    { key: "financial", title: "Financial Analysis", body: "LTM revenue $205MM / EBITDA $42MM (20.5% margin). Net leverage 4.4x through our facility; interest coverage 2.1x; FCF conversion ~58%. Base case de-levers ~0.5x/yr." },
    { key: "risks", title: "Risks & Mitigants", body: "Payor concentration (top-3 ~38%) — mitigated by multi-year contracts with CPI escalators; M&A execution — mitigated by sponsor track record; regulatory — mitigated by compliance posture and covenant protections. Downside (−20% EBITDA) retains ~12% covenant headroom." },
    { key: "structure", title: "Structure & Terms", body: "First-lien unitranche $160MM + $25MM DDTL + $15MM RCF. SOFR+575, 1.00% floor, 99.0 OID, 5-yr. Total net leverage ≤ 5.75x; FCCR ≥ 1.50x; min liquidity $10MM. 50% ECF sweep; 75bps MFN (12-mo sunset); limited incremental." },
    { key: "recommendation", title: "Recommendation", body: "Approve a $185MM first-lien unitranche commitment. Attractive risk-adjusted return with strong documentation and a credit profile consistent with our underwriting standards." },
  ];
  await db.creditMemo.create({
    data: {
      dealId: deal.id,
      status: "In Review",
      sections: JSON.stringify(sections),
      recommendation: "Approve — $185MM first-lien unitranche commitment",
      proposedRating: "3",
    },
  });

  // Covenants + quarterly tests (one near-breach for drama).
  const covLev = await db.covenant.create({ data: { dealId: deal.id, name: "Total Net Leverage", type: "Maintenance", operator: "<=", threshold: 5.75, unit: "x" } });
  const covFccr = await db.covenant.create({ data: { dealId: deal.id, name: "Fixed Charge Coverage", type: "Maintenance", operator: ">=", threshold: 1.5, unit: "x" } });
  const covLiq = await db.covenant.create({ data: { dealId: deal.id, name: "Minimum Liquidity", type: "Maintenance", operator: ">=", threshold: 10, unit: "$MM" } });
  const covCapex = await db.covenant.create({ data: { dealId: deal.id, name: "Maximum Capex", type: "Incurrence", operator: "<=", threshold: 18, unit: "$MM" } });

  const testPeriods = QUARTER_ENDS.slice(-5).concat([{ label: "Q1 2026", y: 2026, m: 3 }]);
  for (let i = 0; i < testPeriods.length; i++) {
    const q = testPeriods[i];
    const isUpcoming = q.y === 2026;
    const lev = +(4.9 - i * 0.08 + (i === 3 ? 0.55 : 0)).toFixed(2); // near-breach at i=3
    await db.covenantTest.create({
      data: {
        covenantId: covLev.id,
        periodEnd: D(q.y, q.m, 30),
        testDate: D(q.m + 1 > 12 ? q.y + 1 : q.y, q.m + 1 > 12 ? 1 : q.m + 1, 15),
        actual: isUpcoming ? null : lev,
        headroomPct: isUpcoming ? null : +(((5.75 - lev) / 5.75) * 100).toFixed(1),
        status: isUpcoming ? "Upcoming" : lev > 5.75 ? "Breach" : "Pass",
        note: !isUpcoming && lev > 5.4 ? "Tight headroom — monitoring closely." : null,
      },
    });
    const fccr = +(2.0 + i * 0.04).toFixed(2);
    await db.covenantTest.create({
      data: {
        covenantId: covFccr.id,
        periodEnd: D(q.y, q.m, 30),
        testDate: D(q.m + 1 > 12 ? q.y + 1 : q.y, q.m + 1 > 12 ? 1 : q.m + 1, 15),
        actual: isUpcoming ? null : fccr,
        headroomPct: isUpcoming ? null : +(((fccr - 1.5) / 1.5) * 100).toFixed(1),
        status: isUpcoming ? "Upcoming" : "Pass",
      },
    });
    const liq = +(20 + i * 2).toFixed(1);
    await db.covenantTest.create({
      data: {
        covenantId: covLiq.id,
        periodEnd: D(q.y, q.m, 30),
        testDate: D(q.m + 1 > 12 ? q.y + 1 : q.y, q.m + 1 > 12 ? 1 : q.m + 1, 15),
        actual: isUpcoming ? null : liq,
        headroomPct: isUpcoming ? null : +(((liq - 10) / 10) * 100).toFixed(1),
        status: isUpcoming ? "Upcoming" : "Pass",
      },
    });
  }
  void covCapex;

  // ───────────────────────────────────────────────────────────────────────
  // Covenant Monitoring Suite — formula-driven, reconciled against reported.
  // ───────────────────────────────────────────────────────────────────────
  const actualFins = await db.financialStatement.findMany({
    where: { borrowerId: borrower.id, isActual: true },
    orderBy: { periodEnd: "asc" },
  });

  // Add-back bridge: Adjusted EBITDA (= fin.ebitda) built up from GAAP.
  const addbacksFor = (adj: number) => {
    const synergies = +(adj * 0.06).toFixed(1); // capped
    const legal = +(adj * 0.03).toFixed(1); // capped
    const proformaMA = +(adj * 0.11).toFixed(1); // aggressive, uncapped
    return { synergies, legal, proformaMA, total: +(synergies + legal + proformaMA).toFixed(1) };
  };

  const JITTER_PERIOD = "Q2 2025"; // one quarter recomputes off-reported → recon-flag
  const SPRINGING_PERIOD = "Q3 2025"; // revolver drawn > 40% → springing test activates

  type PeriodFacts = { periodEnd: Date; label: string; facts: Record<string, number>; reportedLev: number };
  const periodFacts: PeriodFacts[] = [];

  for (const fin of actualFins) {
    const adj = fin.ebitda;
    const ab = addbacksFor(adj);
    const gaap = +(adj - ab.total).toFixed(1);
    const netDebt = +(fin.netLeverage * adj).toFixed(1);
    const cash = +(fin.liquidity * 0.55).toFixed(1);
    const jitter = fin.periodLabel === JITTER_PERIOD ? 1.04 : 1;
    const totDebt = +((netDebt + cash) * jitter).toFixed(1);
    const intExp = +(adj / fin.interestCoverage).toFixed(1);
    const schedAmort = +(totDebt * 0.01).toFixed(1);
    const taxes = +(adj * 0.06).toFixed(1);
    const capex = fin.capex ?? +(adj * 0.08).toFixed(1);
    const rcfUtil = fin.periodLabel === SPRINGING_PERIOD ? 45 : 28;

    const facts: Record<string, number> = {
      SALES_REV_TURN: fin.revenue,
      EBITDA: gaap,
      EBITDA_ADJ: adj,
      TOT_DEBT: totDebt,
      SR_DEBT: +(totDebt * 0.78).toFixed(1),
      CASH: cash,
      INT_EXP: intExp,
      CAPEX: capex,
      SCHED_AMORT: schedAmort,
      FIXED_CHARGES: +(intExp + schedAmort + taxes).toFixed(1),
      RCF_AVAILABLE: +(fin.liquidity * 0.45).toFixed(1),
      RCF_UTIL_PCT: rcfUtil,
    };
    periodFacts.push({ periodEnd: fin.periodEnd, label: fin.periodLabel, facts, reportedLev: fin.netLeverage });

    // Persist fundamental facts (independent BBG source).
    for (const [fieldCode, value] of Object.entries(facts)) {
      await db.fundamentalFact.create({
        data: { borrowerId: borrower.id, periodEnd: fin.periodEnd, periodType: "LTM", fieldCode, value, source: "BBG" },
      });
    }

    // Add-back ledger rows for the latest 4 quarters (waterfall shows the latest).
    if (actualFins.indexOf(fin) >= actualFins.length - 4) {
      const rows = [
        { label: "Run-rate cost synergies", amount: ab.synergies, category: "Synergies", capped: true, aggressiveFlag: false, uncapped: false },
        { label: "Non-recurring legal & restructuring", amount: ab.legal, category: "Non-recurring", capped: true, aggressiveFlag: false, uncapped: false },
        { label: "Pro forma M&A EBITDA (run-rate, unrealized)", amount: ab.proformaMA, category: "ProFormaMA", capped: false, aggressiveFlag: true, uncapped: true },
      ];
      for (let r = 0; r < rows.length; r++) {
        await db.ebitdaAdjustment.create({
          data: { borrowerId: borrower.id, periodEnd: fin.periodEnd, order: r, source: "Compliance Certificate §1.01", ...rows[r] },
        });
      }
    }
  }

  // Threshold step-down schedule (biting — borrower delevering against it).
  const levSchedule: ThresholdStep[] = [
    { effective: "2023-07-15", value: 5.75 },
    { effective: "2024-12-31", value: 5.25 },
    { effective: "2025-09-30", value: 4.5 },
  ];

  const defineCovenant = async (cfg: {
    name: string; category: string; formula: string; operator: string; unit: string;
    threshold: number; schedule?: ThresholdStep[] | null; springing?: object | null;
    basket?: object | null; legacyId?: string | null; ebitdaBasis?: string; source?: string;
  }) => {
    const ast = parse(cfg.formula);
    return db.covenantDefinition.create({
      data: {
        dealId: deal.id,
        legacyCovenantId: cfg.legacyId ?? null,
        name: cfg.name,
        category: cfg.category,
        formula: cfg.formula,
        formulaAst: toJson(ast),
        fieldRefs: toJson(collectFields(ast)),
        ebitdaBasis: cfg.ebitdaBasis ?? "EBITDA_ADJ",
        operator: cfg.operator,
        unit: cfg.unit,
        threshold: cfg.threshold,
        thresholdSchedule: cfg.schedule ? toJson(cfg.schedule) : null,
        springingCondition: cfg.springing ? toJson(cfg.springing) : null,
        basketConfig: cfg.basket ? toJson(cfg.basket) : null,
        source: cfg.source ?? null,
      },
    });
  };

  const defLev = await defineCovenant({
    name: "Total Net Leverage", category: "Maintenance",
    formula: "(TOT_DEBT - CASH) / EBITDA_ADJ", operator: "<=", unit: "x",
    threshold: 5.75, schedule: levSchedule, legacyId: covLev.id,
    source: "Credit Agreement §7.11(a)",
  });
  const defFccr = await defineCovenant({
    name: "Fixed Charge Coverage", category: "Maintenance",
    formula: "(EBITDA_ADJ - CAPEX) / FIXED_CHARGES", operator: ">=", unit: "x",
    threshold: 1.25, legacyId: covFccr.id, source: "Credit Agreement §7.11(b)",
  });
  const defSpring = await defineCovenant({
    name: "Springing Interest Coverage", category: "Springing",
    formula: "EBITDA_ADJ / INT_EXP", operator: ">=", unit: "x",
    threshold: 2.0, springing: { field: "RCF_UTIL_PCT", op: ">", value: 40 },
    source: "Credit Agreement §7.11(c) (springs at 40% RCF utilization)",
  });
  const defIncur = await defineCovenant({
    name: "Incurrence — Debt Basket (Ratio)", category: "Incurrence",
    formula: "(TOT_DEBT - CASH) / EBITDA_ADJ", operator: "<=", unit: "x",
    threshold: 4.5, basket: { type: "Debt", capFormula: "greater of $40MM and 100% of EBITDA_ADJ", builderBasis: "50% CNI" },
    source: "Credit Agreement §6.01 (Permitted Indebtedness)",
  });

  // Generate reconciled CovenantDefTests via the real engine.
  const financialDefs = [defLev, defFccr, defSpring, defIncur];
  for (const defRow of financialDefs) {
    const parsed = toParsedDefinition(defRow);
    const periods =
      defRow.category === "Incurrence" ? periodFacts.slice(-1) : periodFacts;
    for (const pf of periods) {
      const res = evaluate(parsed, pf.facts, pf.periodEnd);
      // Reported = non-jittered recompute (what the borrower's cert shows).
      const cleanFacts =
        pf.label === JITTER_PERIOD
          ? { ...pf.facts, TOT_DEBT: +(pf.facts.TOT_DEBT / 1.04).toFixed(1) }
          : pf.facts;
      const reported = evaluate(parsed, cleanFacts, pf.periodEnd).value;
      const recon =
        res.value != null && reported != null ? reconcile(res.value, reported) : null;
      const status = deriveCovenantStatus({
        category: parsed.category,
        springingActive: res.springingActive,
        recomputed: res.value,
        thresholdApplied: res.thresholdApplied,
        operator: parsed.operator,
        headroomPct: res.headroomPct,
        reconFlag: recon?.flag ?? false,
        hasActual: true,
      });
      await db.covenantDefTest.create({
        data: {
          definitionId: defRow.id,
          periodEnd: pf.periodEnd,
          testDate: new Date(pf.periodEnd.getTime() + 45 * 864e5),
          recomputedValue: res.value,
          reportedValue: reported,
          reconDelta: recon?.delta ?? null,
          thresholdApplied: res.thresholdApplied,
          formulaSnapshot: toJson({ formula: parsed.formula, inputs: res.inputs, value: res.value, thresholdApplied: res.thresholdApplied }),
          headroomPct: res.headroomPct,
          status,
          note:
            status === "Recon-flag"
              ? "Recomputed leverage exceeds reported beyond tolerance — debt figure under review."
              : status === "Near-breach"
                ? "Tight headroom to the stepped-down threshold."
                : null,
        },
      });
    }
    // One upcoming test (Q1 2026) for periodic covenants.
    if (defRow.category !== "Incurrence") {
      await db.covenantDefTest.create({
        data: {
          definitionId: defRow.id,
          periodEnd: D(2026, 3, 31),
          testDate: D(2026, 5, 15),
          status: "Upcoming",
          thresholdApplied: toParsedDefinition(defRow).thresholdSchedule
            ? 4.5
            : defRow.threshold,
        },
      });
    }
  }

  // ── Reporting / information covenants ──
  const reportingDefs = [
    { name: "Quarterly Financial Statements", kind: "Quarterly FS", dueDaysAfter: 45 },
    { name: "Annual Audited Financials", kind: "Annual Audited", dueDaysAfter: 90 },
    { name: "Compliance Certificate", kind: "Compliance Cert", dueDaysAfter: 45 },
  ];
  for (const rd of reportingDefs) {
    const def = await defineCovenant({
      name: rd.name, category: "Reporting", formula: "1", operator: ">=", unit: "x", threshold: 1,
      source: "Credit Agreement §6.01 (Reporting)",
    });
    const obligation = await db.reportingObligation.create({
      data: { definitionId: def.id, kind: rd.kind, dueDaysAfter: rd.dueDaysAfter, fiscalYearEndMonth: 12 },
    });
    // Deliveries for the last 4 quarters: mostly on time, one Late, one Pending.
    const recent = actualFins.slice(-3);
    for (const fin of recent) {
      const due = new Date(fin.periodEnd.getTime() + rd.dueDaysAfter * 864e5);
      const isLate = rd.kind === "Compliance Cert" && fin.periodLabel === "Q2 2025";
      const delivered = isLate
        ? new Date(due.getTime() + 7 * 864e5)
        : new Date(due.getTime() - 5 * 864e5);
      await db.reportingDelivery.create({
        data: {
          obligationId: obligation.id,
          periodEnd: fin.periodEnd,
          dueDate: due,
          deliveredDate: delivered,
          status: isLate ? "Late" : "Delivered",
        },
      });
    }
    // Upcoming Q1 2026 — pending.
    await db.reportingDelivery.create({
      data: {
        obligationId: obligation.id,
        periodEnd: D(2026, 3, 31),
        dueDate: D(2026, 5, 15),
        status: "Pending",
      },
    });
  }

  // Valuation (DCF + Yield).
  await db.valuation.createMany({
    data: [
      { borrowerId: borrower.id, asOf: D(2025, 12, 31), method: "Yield", fairValuePct: 99.5, fairValueAmt: 184.1, costBasis: 185, discountRate: 10.1, status: "Final", note: "Held near par; performing in line with base case." },
      { borrowerId: borrower.id, asOf: D(2025, 12, 31), method: "DCF", fairValuePct: 99.8, fairValueAmt: 184.6, costBasis: 185, discountRate: 9.8, status: "Committee", note: "DCF cross-check; modest premium to yield method." },
    ],
  });

  // Cashflow schedule (20 periods incl. DDTL drawdown + interest).
  let bal = 160;
  for (let i = 0; i < 20; i++) {
    const year = 2026 + Math.floor(i / 4);
    const m = ((i % 4) + 1) * 3;
    const isProjected = year > 2026 || (year === 2026 && m > 6);
    const drawdown = i === 2 ? 12 : i === 6 ? 8 : 0; // DDTL draws
    const paydown = i >= 4 && i % 2 === 0 ? +(bal * 0.012).toFixed(1) : 0;
    const interest = +((bal * (4.35 + 5.75) / 100) / 4).toFixed(1);
    const ending = +(bal + drawdown - paydown).toFixed(1);
    await db.cashFlowSchedule.create({
      data: {
        dealId: deal.id,
        periodEnd: D(year, m, 30),
        periodLabel: `Q${(i % 4) + 1} ${year}`,
        beginningBal: bal,
        drawdown,
        paydown,
        pikAccrued: 0,
        interest,
        endingBal: ending,
        isProjected,
        order: i,
      },
    });
    bal = ending;
  }

  // Lifecycle events.
  await db.lifecycleEvent.createMany({
    data: [
      { dealId: deal.id, type: "Notice", title: "Wall-cross & NDA executed", detail: "Deal team wall-crossed; NDA executed with Brightwater Capital.", status: "Completed", effectiveDate: D(2026, 4, 2), createdBy: "Sam Okafor" },
      { dealId: deal.id, type: "Notice", title: "Indicative term sheet issued", detail: "Issued indicative terms: $185MM unitranche, S+575, 1.00% floor, 99.0 OID.", status: "Completed", effectiveDate: D(2026, 4, 20), createdBy: "Jordan Mercer" },
      { dealId: deal.id, type: "Drawdown", title: "Projected DDTL draw — Acq. #1", detail: "Anticipated $12MM delayed-draw to fund first tuck-in acquisition.", amount: 12, status: "Pending", effectiveDate: D(2026, 9, 30), createdBy: "Avery Patel" },
      { dealId: deal.id, type: "Waiver", title: "Reporting deadline waiver (illustrative)", detail: "Illustrative 15-day extension granted for Q2 compliance certificate delivery.", status: "Completed", effectiveDate: D(2026, 5, 5), createdBy: "Jordan Mercer" },
      { dealId: deal.id, type: "RateReset", title: "SOFR reset — Q3 2026", detail: "Quarterly base-rate reset; 1.00% floor not in effect at current SOFR.", status: "Pending", effectiveDate: D(2026, 7, 1), createdBy: "Avery Patel" },
    ],
  });

  // IC votes (4 approve / 1 conditional).
  await db.iCVote.createMany({
    data: [
      { dealId: deal.id, voter: "Riley Chen", vote: "Approve", comment: "Strong credit; supportive of terms." },
      { dealId: deal.id, voter: "Morgan Lee", vote: "Approve", comment: "Comfortable with leverage and documentation." },
      { dealId: deal.id, voter: "Taylor Brooks", vote: "Approve", comment: "Like the recurring revenue and equity cushion." },
      { dealId: deal.id, voter: "Casey Nguyen", vote: "Conditional", comment: "Approve subject to tightening change-of-control consent." },
      { dealId: deal.id, voter: "Jordan Mercer", vote: "Approve", comment: "Recommend approval." },
    ],
  });

  // Tasks.
  await db.task.createMany({
    data: [
      { dealId: deal.id, title: "Finalize covenant package negotiation", status: "Doing", priority: "High", assignee: "Jordan Mercer", dueDate: D(2026, 6, 18) },
      { dealId: deal.id, title: "Resolve change-of-control consent flag", status: "Todo", priority: "High", assignee: "Wexler & Crane", dueDate: D(2026, 6, 20) },
      { dealId: deal.id, title: "Complete management bench assessment", status: "Doing", priority: "Medium", assignee: "Jordan Mercer", dueDate: D(2026, 6, 22) },
      { dealId: deal.id, title: "Circulate final IC memo", status: "Todo", priority: "High", assignee: "Avery Patel", dueDate: D(2026, 6, 25) },
      { dealId: deal.id, title: "Confirm HIPAA / data-privacy diligence", status: "Doing", priority: "Medium", assignee: "Sam Okafor", dueDate: D(2026, 6, 19) },
      { dealId: deal.id, title: "Lock sources & uses with sponsor", status: "Done", priority: "Medium", assignee: "Avery Patel", dueDate: D(2026, 6, 10) },
    ],
  });

  // Notes (mgmt call + internal).
  await db.note.createMany({
    data: [
      { dealId: deal.id, kind: "MgmtCall", title: "Management call — May 14", author: "Avery Patel", body: "CEO confirmed acquisition pipeline; CFO walked through working-capital seasonality and maintenance capex. No material adverse items disclosed. Comfortable with management depth pending bench review.", createdAt: D(2026, 5, 14) },
      { dealId: deal.id, kind: "SiteVisit", title: "Site visit — Columbus flagship clinic", author: "Jordan Mercer", body: "Visited the flagship Columbus clinic and two satellites. Strong patient throughput, clean facilities, engaged staff. Operational systems well-integrated post-acquisition.", createdAt: D(2026, 5, 8) },
      { dealId: deal.id, kind: "Internal", title: "Pricing discussion", author: "Jordan Mercer", body: "Held at S+575 / 99.0 OID after comps review (DLEN shows healthcare services unitranche clearing S+550–600). Floor at 1.00%. Upfront 2.50%.", createdAt: D(2026, 4, 18) },
    ],
  });

  // Activity log.
  await db.activityLog.createMany({
    data: [
      { dealId: deal.id, actor: "Sam Okafor", role: "Compliance", action: "wall-crossed the deal team", target: "Project Atlas", createdAt: D(2026, 4, 2, 9) },
      { dealId: deal.id, actor: "Jordan Mercer", role: "Deal Lead", action: "created the deal", target: "Project Atlas", createdAt: D(2026, 4, 2, 10) },
      { dealId: deal.id, actor: "Avery Patel", role: "Analyst", action: "uploaded 11 documents to the data room", target: "Data Room", createdAt: D(2026, 4, 10, 14) },
      { dealId: deal.id, actor: "Jordan Mercer", role: "Deal Lead", action: "issued an indicative term sheet", target: "Structuring", createdAt: D(2026, 4, 20, 11) },
      { dealId: deal.id, actor: "Avery Patel", role: "Analyst", action: "drafted the credit memo", target: "IC Memo", createdAt: D(2026, 5, 2, 16) },
      { dealId: deal.id, actor: "Riley Chen", role: "IC Member", action: "voted Approve", target: "IC Vote", createdAt: D(2026, 5, 30, 15) },
    ],
  });
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
