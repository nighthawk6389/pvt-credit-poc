import { db } from "@/lib/db";
import { canSeeDeal, type Role } from "@/lib/auth/roles";
import { borrowerProfiles, facilityTerms } from "@/server/masters";

export async function getPipeline(role: Role) {
  const deals = await db.deal.findMany({
    where: { stage: { notIn: ["Closed"] } },
    include: {
      borrower: { include: { financials: { orderBy: { periodEnd: "desc" }, take: 1 } } },
      sponsor: true,
      lead: true,
      facilities: { orderBy: { order: "asc" }, take: 1 },
    },
    orderBy: { dealSize: "desc" },
  });
  const visible = deals.filter((d) => canSeeDeal(role, d));
  const [profile, terms] = await Promise.all([
    borrowerProfiles(visible.map((d) => d.borrower)),
    facilityTerms(visible.flatMap((d) => d.facilities)),
  ]);
  return visible
    .map((d) => ({ ...d, borrower: profile(d.borrower), facilities: d.facilities.map(terms) }))
    .map((d) => ({
      id: d.id,
      codeName: d.codeName,
      stage: d.stage,
      status: d.status,
      borrower: d.borrower.name,
      sector: d.borrower.sector,
      sponsor: d.sponsor?.name ?? null,
      size: d.dealSize,
      spread: d.facilities[0]?.spreadBps ?? null,
      leverage: d.borrower.financials[0]?.netLeverage ?? null,
      ebitda: d.borrower.financials[0]?.ebitda ?? null,
      probability: d.probability,
      lead: d.lead?.name ?? null,
      targetClose: d.targetClose?.toISOString() ?? null,
      isPrivileged: d.isPrivileged,
    }));
}

export async function getPortfolioBook(role: Role) {
  const deals = await db.deal.findMany({
    where: { stage: "Closed" },
    include: {
      borrower: {
        include: {
          financials: { orderBy: { periodEnd: "desc" }, take: 1 },
          valuations: { orderBy: { asOf: "desc" }, take: 1 },
        },
      },
      sponsor: true,
      facilities: { orderBy: { order: "asc" }, take: 1 },
      covenants: { include: { tests: true } },
    },
    orderBy: { dealSize: "desc" },
  });
  const visible = deals.filter((d) => canSeeDeal(role, d));
  const [profile, terms] = await Promise.all([
    borrowerProfiles(visible.map((d) => d.borrower)),
    facilityTerms(visible.flatMap((d) => d.facilities)),
  ]);
  return visible
    .map((d) => ({ ...d, borrower: profile(d.borrower), facilities: d.facilities.map(terms) }))
    .map((d) => {
      const breaches = d.covenants
        .flatMap((c) => c.tests)
        .filter((t) => t.status === "Breach").length;
      return {
        id: d.id,
        borrowerId: d.borrower.id,
        codeName: d.codeName,
        borrower: d.borrower.name,
        sector: d.borrower.sector,
        sponsor: d.sponsor?.name ?? null,
        size: d.dealSize,
        funded: d.facilities[0]?.funded ?? 0,
        spread: d.facilities[0]?.spreadBps ?? null,
        leverage: d.borrower.financials[0]?.netLeverage ?? null,
        coverage: d.borrower.financials[0]?.interestCoverage ?? null,
        rating: d.borrower.riskRating,
        trend: d.borrower.riskTrend,
        watchlist: d.borrower.watchlist,
        mark: d.borrower.valuations[0]?.fairValuePct ?? null,
        breaches,
      };
    });
}

export async function getBorrower(role: Role, borrowerId: string) {
  const borrower = await db.borrower.findUnique({
    where: { id: borrowerId },
    include: {
      sponsor: true,
      financials: { orderBy: { periodEnd: "asc" } },
      valuations: { orderBy: { asOf: "desc" } },
      deals: {
        include: {
          facilities: { orderBy: { order: "asc" } },
          covenants: { include: { tests: { orderBy: { periodEnd: "asc" } } } },
          events: { orderBy: { effectiveDate: "desc" }, take: 5 },
        },
      },
    },
  });
  if (!borrower) return null;
  // Respect information barrier on the borrower's deals.
  const visibleDeals = borrower.deals.filter((d) => canSeeDeal(role, d));
  if (visibleDeals.length === 0 && borrower.deals.length > 0) return { blocked: true as const };
  const [profile, terms] = await Promise.all([
    borrowerProfiles([borrower]),
    facilityTerms(visibleDeals.flatMap((d) => d.facilities)),
  ]);
  return {
    ...profile(borrower),
    deals: visibleDeals.map((d) => ({ ...d, facilities: d.facilities.map(terms) })),
    blocked: false as const,
  };
}

export async function getCovenantCalendar(role: Role) {
  const tests = await db.covenantTest.findMany({
    include: {
      covenant: {
        include: { deal: { include: { borrower: true } } },
      },
    },
    orderBy: { periodEnd: "desc" },
  });
  const visible = tests.filter((t) => canSeeDeal(role, t.covenant.deal));
  const profile = await borrowerProfiles(visible.map((t) => t.covenant.deal.borrower));
  return visible
    .map((t) => ({ ...t, borrower: profile(t.covenant.deal.borrower) }))
    .map((t) => ({
      id: t.id,
      dealId: t.covenant.dealId,
      borrowerId: t.borrower.id,
      borrower: t.borrower.name,
      sector: t.borrower.sector,
      covenant: t.covenant.name,
      type: t.covenant.type,
      unit: t.covenant.unit,
      operator: t.covenant.operator,
      threshold: t.covenant.threshold,
      actual: t.actual,
      headroomPct: t.headroomPct,
      status: t.status,
      periodEnd: t.periodEnd.toISOString(),
      testDate: t.testDate.toISOString(),
    }));
}

export async function getSponsors(role: Role) {
  const sponsors = await db.sponsor.findMany({
    include: {
      relationshipOwner: true,
      deals: {
        include: {
          borrower: true,
          facilities: { orderBy: { order: "asc" }, take: 1 },
        },
      },
    },
    orderBy: { aum: "desc" },
  });
  const profile = await borrowerProfiles(sponsors.flatMap((s) => s.deals.map((d) => d.borrower)));
  return sponsors.map((s) => {
    const visible = s.deals.filter((d) => canSeeDeal(role, d));
    const closed = visible.filter((d) => d.stage === "Closed");
    return {
      id: s.id,
      name: s.name,
      type: s.type,
      aum: s.aum,
      hqCity: s.hqCity,
      owner: s.relationshipOwner?.name ?? null,
      vintage: s.vintage,
      dealCount: visible.length,
      closedCount: closed.length,
      committed: visible.reduce((sum, d) => sum + d.dealSize, 0),
      deals: visible.map((d) => ({
        id: d.id,
        codeName: d.codeName,
        borrower: profile(d.borrower).name,
        stage: d.stage,
        size: d.dealSize,
      })),
    };
  });
}

export async function getComplianceData() {
  const deals = await db.deal.findMany({
    include: { team: { include: { user: true } }, borrower: true },
    orderBy: { createdAt: "desc" },
  });
  const profile = await borrowerProfiles(deals.map((d) => d.borrower));
  const activity = await db.activityLog.findMany({
    where: { OR: [{ action: { contains: "wall" } }, { action: { contains: "cross" } }] },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { actor: true },
  });
  return {
    deals: deals.map((d) => ({
      id: d.id,
      codeName: d.codeName,
      borrower: profile(d.borrower).name,
      isPrivileged: d.isPrivileged,
      stage: d.stage,
      team: d.team.map((m) => ({
        name: m.user.name,
        role: m.role,
        title: m.user.title,
        wallCrossed: m.wallCrossed,
        crossedAt: m.crossedAt?.toISOString() ?? null,
      })),
    })),
    activity: activity.map((a) => ({
      id: a.id,
      actor: a.actor?.name ?? "System",
      role: a.role,
      action: a.action,
      target: a.target,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}
