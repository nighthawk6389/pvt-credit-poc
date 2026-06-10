// Lightweight financial math for returns analytics (POC).

export type DatedCashflow = { date: Date; amount: number };

/**
 * XIRR — internal rate of return for irregularly-dated cashflows.
 * Bisection on the NPV function; robust enough for demo data.
 * Returns annualized rate as a decimal (e.g. 0.112 = 11.2%), or null.
 */
export function xirr(flows: DatedCashflow[]): number | null {
  if (flows.length < 2) return null;
  const hasNeg = flows.some((f) => f.amount < 0);
  const hasPos = flows.some((f) => f.amount > 0);
  if (!hasNeg || !hasPos) return null;

  const t0 = flows[0].date.getTime();
  const yrs = (d: Date) => (d.getTime() - t0) / (365.25 * 24 * 3600 * 1000);

  const npv = (rate: number) =>
    flows.reduce((s, f) => s + f.amount / Math.pow(1 + rate, yrs(f.date)), 0);

  let lo = -0.95;
  let hi = 10;
  let nLo = npv(lo);
  const nHi = npv(hi);
  if (nLo * nHi > 0) return null; // no sign change — no root in range

  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const nMid = npv(mid);
    if (Math.abs(nMid) < 1e-7) return mid;
    if (nLo * nMid < 0) {
      hi = mid;
    } else {
      lo = mid;
      nLo = nMid;
    }
  }
  return (lo + hi) / 2;
}

/** MOIC — total value (distributions + residual) over invested capital. */
export function moic(invested: number, totalValue: number): number | null {
  if (invested <= 0) return null;
  return totalValue / invested;
}

/** Quarter-end dates strictly after `from`, up to and including `to`. */
export function quarterEndsBetween(from: Date, to: Date): Date[] {
  const out: Date[] = [];
  let y = from.getUTCFullYear();
  let q = Math.floor(from.getUTCMonth() / 3) + 1; // current quarter
  for (;;) {
    q += 1;
    if (q > 4) {
      q = 1;
      y += 1;
    }
    // Last day of quarter q
    const d = new Date(Date.UTC(y, q * 3, 0));
    if (d > to) break;
    if (d > from) out.push(d);
    if (out.length > 60) break; // safety
  }
  return out;
}
