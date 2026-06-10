import { db } from "@/lib/db";
import { canSeeDeal, type Role } from "@/lib/auth/roles";
import { xirr, moic, quarterEndsBetween, type DatedCashflow } from "@/lib/finance";

const SOFR_PCT = 4.35; // base-rate proxy, matches the Bloomberg adapter
const AS_OF = new Date(Date.UTC(2026, 5, 10)); // demo "today"

export type PositionReturn = {
  dealId: string;
  borrowerId: string;
  borrower: string;
  sector: string;
  entryDate: string;
  invested: number; // net of OID, $MM
  interestReceived: number; // $MM cumulative
  feesReceived: number; // $MM upfront
  residualValue: number; // mark × funded, $MM
  totalValue: number;
  moic: number | null;
  irrPct: number | null; // gross IRR, annualized %
  cashYieldPct: number | null; // annualized cash yield on invested
  mark: number | null;
  watchlist: boolean;
};

export async function getReturns(role: Role) {
  const deals = await db.deal.findMany({
    where: { stage: "Closed" },
    include: {
      borrower: {
        include: { valuations: { orderBy: { asOf: "desc" }, take: 1 } },
      },
      facilities: { orderBy: { order: "asc" } },
    },
  });

  const positions = deals
    .filter((d) => canSeeDeal(role, d))
    .map((d): PositionReturn | null => {
      const fac = d.facilities[0];
      const funded = fac?.funded ?? 0;
      if (!fac || funded <= 0) return null;

      const entry = d.targetClose ?? d.createdAt;
      const oid = fac.oidPct / 100;
      const invested = funded * (1 - oid);
      const fees = (funded * fac.upfrontFeeBps) / 10_000;
      const couponPct = SOFR_PCT + fac.spreadBps / 100; // floor not binding at current SOFR
      const quarterlyInterest = (funded * couponPct) / 100 / 4;

      const mark = d.borrower.valuations[0]?.fairValuePct ?? null;
      const residual = ((mark ?? 100) / 100) * funded;

      const quarters = quarterEndsBetween(entry, AS_OF);
      const interestReceived = quarterlyInterest * quarters.length;

      const flows: DatedCashflow[] = [
        { date: entry, amount: -invested + fees },
        ...quarters.map((q) => ({ date: q, amount: quarterlyInterest })),
        { date: AS_OF, amount: residual },
      ];

      const irr = xirr(flows);
      const totalValue = interestReceived + fees + residual;
      const yearsHeld = Math.max(
        0.25,
        (AS_OF.getTime() - entry.getTime()) / (365.25 * 24 * 3600 * 1000),
      );

      return {
        dealId: d.id,
        borrowerId: d.borrower.id,
        borrower: d.borrower.name,
        sector: d.borrower.sector,
        entryDate: entry.toISOString(),
        invested: +invested.toFixed(1),
        interestReceived: +interestReceived.toFixed(1),
        feesReceived: +fees.toFixed(1),
        residualValue: +residual.toFixed(1),
        totalValue: +totalValue.toFixed(1),
        moic: moic(invested, totalValue),
        irrPct: irr != null ? +(irr * 100).toFixed(1) : null,
        cashYieldPct: +(((interestReceived / yearsHeld) / invested) * 100).toFixed(1),
        mark,
        watchlist: d.borrower.watchlist,
      } satisfies PositionReturn;
    })
    .filter((p): p is PositionReturn => p !== null);

  // Portfolio aggregates (invested-weighted).
  const totInvested = positions.reduce((s, p) => s + p.invested, 0);
  const totValue = positions.reduce((s, p) => s + p.totalValue, 0);
  const totInterest = positions.reduce((s, p) => s + p.interestReceived, 0);
  const totFees = positions.reduce((s, p) => s + p.feesReceived, 0);
  const totResidual = positions.reduce((s, p) => s + p.residualValue, 0);
  const wIrr =
    totInvested > 0
      ? positions.reduce((s, p) => s + (p.irrPct ?? 0) * p.invested, 0) / totInvested
      : null;

  return {
    positions: positions.sort((a, b) => (b.irrPct ?? -99) - (a.irrPct ?? -99)),
    summary: {
      invested: totInvested,
      totalValue: totValue,
      realized: totInterest + totFees,
      unrealized: totResidual - positions.reduce((s, p) => s + p.invested, 0),
      portfolioMoic: totInvested > 0 ? totValue / totInvested : null,
      weightedIrrPct: wIrr != null ? +wIrr.toFixed(1) : null,
      asOf: AS_OF.toISOString(),
    },
  };
}
