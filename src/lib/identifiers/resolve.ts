import type { IssuerKey } from "../bloomberg/types";
import { DISPLAY_ORDER, type IdScheme } from "./schemes";

/** The columns of a stored identifier that resolution needs. */
export interface StoredIdentifier {
  scheme: string;
  value: string;
  namespace: string;
  validFrom: Date;
  validTo: Date | null;
}

/**
 * In force on `asOf`: validFrom ≤ asOf < validTo. Retired identifiers stay
 * stored, so "what was this tranche called on 31 March?" can be answered for
 * marks and agent reconciliations.
 */
export function isLive(row: StoredIdentifier, asOf: Date = new Date()): boolean {
  return row.validFrom <= asOf && (row.validTo === null || asOf < row.validTo);
}

export function liveAt<T extends StoredIdentifier>(rows: T[], asOf: Date = new Date()): T[] {
  return rows.filter((r) => isLive(r, asOf));
}

/** Issuer-level schemes Bloomberg can identify a company by, best first. */
export const ISSUER_KEY_PRECEDENCE = ["BBG_COMPANY", "LEI"] as const satisfies readonly IdScheme[];

/**
 * The key to send Bloomberg for an issuer-level request (FA, DRSK, CRPR).
 *
 * `null` means no coverage: the borrower has no identifier Bloomberg can
 * resolve. That is a normal answer, not an error — many private, sponsor-backed
 * borrowers have none — and callers fall back to compliance-certificate data.
 */
export function pickIssuerKey(
  rows: StoredIdentifier[],
  name: string,
  asOf: Date = new Date(),
): IssuerKey | null {
  const live = liveAt(rows, asOf);
  for (const scheme of ISSUER_KEY_PRECEDENCE) {
    const hit = live.find((r) => r.scheme === scheme);
    if (hit) return { scheme, value: hit.value, name };
  }
  return null;
}

/** Live identifiers in the order people quote them. */
export function forDisplay<T extends StoredIdentifier>(rows: T[], asOf: Date = new Date()): T[] {
  const rank = (s: string) => {
    const i = DISPLAY_ORDER.indexOf(s as IdScheme);
    return i === -1 ? DISPLAY_ORDER.length : i;
  };
  return liveAt(rows, asOf).sort((a, b) => rank(a.scheme) - rank(b.scheme));
}
