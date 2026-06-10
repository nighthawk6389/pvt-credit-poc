import { db } from "@/lib/db";
import { canSeeDeal, type Role } from "@/lib/auth/roles";
import { bloomberg } from "@/lib/bloomberg/client";

export async function getDashboardData(role: Role) {
  const deals = await db.deal.findMany({
    include: {
      borrower: {
        include: {
          financials: { orderBy: { periodEnd: "desc" }, take: 1 },
          valuations: { orderBy: { asOf: "desc" }, take: 1 },
        },
      },
      facilities: true,
    },
  });
  const visible = deals.filter((d) => canSeeDeal(role, d));

  const closed = visible.filter((d) => d.stage === "Closed");
  const active = visible.filter((d) => d.stage !== "Closed" && d.stage !== "Passed");

  const totalCommitted = visible.reduce((s, d) => s + d.dealSize, 0);
  const totalFunded = closed.reduce(
    (s, d) => s + d.facilities.reduce((fs, f) => fs + f.funded, 0),
    0,
  );

  // Build positions for the Bloomberg PORT analytics call.
  const positions = closed.map((d) => {
    const fin = d.borrower.financials[0];
    const fac = d.facilities[0];
    return {
      sector: d.borrower.sector,
      spreadBps: fac?.spreadBps ?? 550,
      leverage: fin?.netLeverage ?? 4.5,
      yieldPct: (fac?.spreadBps ?? 550) / 100 + 4.35,
      size: d.dealSize,
      rating: undefined as string | undefined,
    };
  });
  const port = positions.length
    ? await bloomberg.getPortfolioRisk({ positions })
    : null;

  // Pipeline by stage.
  const stageCounts = new Map<string, number>();
  for (const d of active)
    stageCounts.set(d.stage, (stageCounts.get(d.stage) ?? 0) + 1);

  // Watchlist.
  const watchlist = closed
    .filter((d) => d.borrower.watchlist)
    .map((d) => ({
      borrowerId: d.borrower.id,
      name: d.borrower.name,
      sector: d.borrower.sector,
      rating: d.borrower.riskRating,
      trend: d.borrower.riskTrend,
      mark: d.borrower.valuations[0]?.fairValuePct ?? null,
      size: d.dealSize,
    }));

  // Covenant calendar: upcoming tests + recent breaches across visible deals.
  const visibleIds = visible.map((d) => d.id);
  const tests = await db.covenantTest.findMany({
    where: { covenant: { dealId: { in: visibleIds } } },
    include: { covenant: { include: { deal: { include: { borrower: true } } } } },
    orderBy: { testDate: "asc" },
  });
  const breaches = tests.filter((t) => t.status === "Breach");
  const upcoming = tests
    .filter((t) => t.status === "Upcoming")
    .slice(0, 6)
    .map((t) => ({
      id: t.id,
      borrower: t.covenant.deal.borrower.name,
      borrowerId: t.covenant.deal.borrower.id,
      covenant: t.covenant.name,
      testDate: t.testDate.toISOString(),
      threshold: t.covenant.threshold,
      unit: t.covenant.unit,
      operator: t.covenant.operator,
    }));

  // Recent activity.
  const activity = await db.activityLog.findMany({
    where: { OR: [{ dealId: { in: visibleIds } }, { dealId: null }] },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return {
    kpis: {
      totalCommitted,
      totalFunded,
      activeCount: active.length,
      closedCount: closed.length,
      watchlistCount: watchlist.length,
      breachCount: breaches.length,
      weightedSpreadBps: port?.weightedSpreadBps ?? null,
      weightedLeverage: port?.weightedLeverage ?? null,
      weightedYieldPct: port?.weightedYieldPct ?? null,
      var95Pct: port?.var95Pct ?? null,
    },
    sectorExposure: port?.sectorExposure ?? [],
    ratingExposure: port?.ratingExposure ?? [],
    stageCounts: [...stageCounts.entries()].map(([stage, count]) => ({ stage, count })),
    pipelineValue: active.reduce((s, d) => s + d.dealSize, 0),
    watchlist,
    breaches: breaches.map((t) => ({
      id: t.id,
      borrower: t.covenant.deal.borrower.name,
      borrowerId: t.covenant.deal.borrower.id,
      dealId: t.covenant.dealId,
      covenant: t.covenant.name,
      actual: t.actual,
      threshold: t.covenant.threshold,
      unit: t.covenant.unit,
      periodEnd: t.periodEnd.toISOString(),
    })),
    upcoming,
    activity: activity.map((a) => ({
      id: a.id,
      actor: a.actor,
      role: a.role,
      action: a.action,
      target: a.target,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}
