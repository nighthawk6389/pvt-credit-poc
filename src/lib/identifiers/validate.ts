import { isValidCusip, isValidFigi, isValidIsin, isValidLei } from "./check-digits";
import { INTERNAL_PREFIX, SCHEME_SPECS, isIdScheme, type IdScheme, type IdTarget } from "./schemes";

export interface IdentifierInput {
  target: IdTarget;
  scheme: string;
  value: string;
  namespace?: string | null;
}

export type IdentifierCheck =
  | { ok: true; scheme: IdScheme; value: string; namespace: string }
  | { ok: false; error: string };

const MAX_LEN = 64;

/** Trimmed, single-spaced, upper-case — for opaque references and namespaces. */
const opaque = (s: string) => s.trim().replace(/\s+/g, " ").toUpperCase();
/** Codes are written with spaces and dashes for readability; strip them. */
const compact = (s: string) => s.replace(/[\s\-./]/g, "").toUpperCase();

/** The stored form of a value. Two spellings of one identifier normalise equal. */
export function normaliseValue(scheme: IdScheme, raw: string): string {
  switch (scheme) {
    case "CUSIP":
    case "ISIN":
    case "FIGI":
    case "LEI":
    case "LOANX":
    case "BBG_COMPANY":
      return compact(raw);
    case "CIK": {
      const digits = compact(raw);
      return /^\d{1,10}$/.test(digits) ? digits.padStart(10, "0") : digits;
    }
    default:
      return opaque(raw);
  }
}

/** Format and check-digit rules per scheme. Returns an error, or null if valid. */
function checkValue(scheme: IdScheme, v: string, target: IdTarget): string | null {
  switch (scheme) {
    case "CUSIP":
      return isValidCusip(v) ? null : "is not a valid CUSIP (9 characters; the last is a check digit)";
    case "ISIN":
      return isValidIsin(v) ? null : "is not a valid ISIN (country code, 9 characters, check digit)";
    case "FIGI":
      return isValidFigi(v) ? null : "is not a valid FIGI (12 characters, no vowels, check digit)";
    case "LEI":
      return isValidLei(v) ? null : "is not a valid LEI (20 characters; the last two are check digits)";
    case "LOANX":
      // LoanX IDs carry no public check digit, so this is a format check only.
      return /^LX\d{6}$/.test(v) ? null : "is not a LoanX ID (LX followed by six digits)";
    case "BBG_COMPANY":
      return /^\d{1,12}$/.test(v) ? null : "is not a Bloomberg company ID (digits only)";
    case "CIK":
      return /^\d{10}$/.test(v) ? null : "is not a CIK (up to ten digits)";
    case "INTERNAL": {
      const prefix = INTERNAL_PREFIX[target];
      return new RegExp(`^${prefix}-\\d{6}$`).test(v)
        ? null
        : `is not an internal ${target} reference (${prefix}-000000)`;
    }
    default:
      return v.length > 0 ? null : "is empty";
  }
}

/**
 * Validate and normalise an identifier before it is stored. Rejects a scheme
 * on the wrong target, a bad check digit, a missing namespace where one is
 * needed, and a namespace where the scheme is globally unique.
 */
export function validateIdentifier(input: IdentifierInput): IdentifierCheck {
  if (!isIdScheme(input.scheme)) return { ok: false, error: `Unknown identifier scheme "${input.scheme}"` };
  const scheme = input.scheme;
  const spec = SCHEME_SPECS[scheme];

  if (!spec.targets.includes(input.target)) {
    return {
      ok: false,
      error: `${spec.label} identifies a ${spec.targets.join(" or ")}, not a ${input.target}`,
    };
  }

  const value = normaliseValue(scheme, input.value ?? "");
  if (value.length === 0) return { ok: false, error: `${spec.label} is empty` };
  if (value.length > MAX_LEN) return { ok: false, error: `${spec.label} is longer than ${MAX_LEN} characters` };
  const problem = checkValue(scheme, value, input.target);
  if (problem) return { ok: false, error: `"${value}" ${problem}` };

  const namespace = opaque(input.namespace ?? "");
  if (spec.namespaced && namespace === "") {
    return { ok: false, error: `${spec.label} is only unique within its issuer, so a namespace is required` };
  }
  if (!spec.namespaced && namespace !== "") {
    return { ok: false, error: `${spec.label} is globally unique, so it takes no namespace` };
  }
  if (namespace.length > MAX_LEN) return { ok: false, error: `Namespace is longer than ${MAX_LEN} characters` };

  return { ok: true, scheme, value, namespace };
}
