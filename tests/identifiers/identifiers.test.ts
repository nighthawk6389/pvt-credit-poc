import { describe, it, expect } from "vitest";

import {
  cusipCheckDigit,
  figiCheckDigit,
  isValidCusip,
  isValidFigi,
  isValidIsin,
  isValidLei,
  isinCheckDigit,
  leiCheckDigits,
  normaliseValue,
  pickIssuerKey,
  liveAt,
  validateIdentifier,
  type StoredIdentifier,
} from "@/lib/identifiers";

// Real, published identifiers of public companies. Each was also checked
// against an independent implementation written from the specs, so these
// tests are not just the algorithm agreeing with itself.
const REAL = {
  cusip: ["037833100", "594918104", "38259P508", "459200101"],
  isin: ["US0378331005", "US5949181045", "AU0000XVGZA3", "GB0002634946"],
  lei: ["506700GE1G29325QX363", "HWUPKR0MPOU8FGXBT394", "8I5DZWZKVSZI1NUHU748", "784F5XWPLTWKTBV3E584"],
  figi: ["BBG000B9XRY4", "BBG000BPH459", "BBG000BLNNH6", "BBG000BVPV84"],
};

const DIGITS = "0123456789";

/** Every variant of `id` with exactly one digit replaced by a different digit. */
function digitSubstitutions(id: string, from: number, to: number): string[] {
  const out: string[] = [];
  for (let i = from; i < to; i++) {
    if (!DIGITS.includes(id[i])) continue;
    for (const d of DIGITS) if (d !== id[i]) out.push(id.slice(0, i) + d + id.slice(i + 1));
  }
  return out;
}

describe("check digits", () => {
  it("accept real identifiers and reproduce their published check digits", () => {
    for (const c of REAL.cusip) {
      expect(isValidCusip(c)).toBe(true);
      expect(cusipCheckDigit(c.slice(0, 8))).toBe(Number(c[8]));
    }
    for (const c of REAL.isin) {
      expect(isValidIsin(c)).toBe(true);
      expect(isinCheckDigit(c.slice(0, 11))).toBe(Number(c[11]));
    }
    for (const c of REAL.lei) {
      expect(isValidLei(c)).toBe(true);
      expect(leiCheckDigits(c.slice(0, 18))).toBe(c.slice(18));
    }
    for (const c of REAL.figi) {
      expect(isValidFigi(c)).toBe(true);
      expect(figiCheckDigit(c.slice(0, 11))).toBe(Number(c[11]));
    }
  });

  // The guarantee these schemes are chosen for: one mistyped digit never
  // produces another valid identifier.
  it("reject every single-digit typo in a real CUSIP, ISIN and FIGI", () => {
    const cases: [string[], (v: string) => boolean][] = [
      [REAL.cusip.flatMap((c) => digitSubstitutions(c, 0, 9)), isValidCusip],
      [REAL.isin.flatMap((c) => digitSubstitutions(c, 2, 12)), isValidIsin],
      [REAL.figi.flatMap((c) => digitSubstitutions(c, 3, 12)), isValidFigi],
    ];
    for (const [typos, valid] of cases) {
      expect(typos.length).toBeGreaterThan(50);
      expect(typos.filter(valid)).toEqual([]);
    }
  });

  // LEI check digits are computed after letters expand to two digits, so a
  // digit-for-letter error shifts the string and can slip through ("X3" and
  // "3X" expand identically). The guarantee is for like-for-like errors.
  it("reject every like-for-like typo and transposition in a real LEI", () => {
    const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const sameClass = (a: string, b: string) => DIGITS.includes(a) === DIGITS.includes(b);
    const variants: string[] = [];
    for (const lei of REAL.lei) {
      for (let i = 0; i < lei.length; i++) {
        for (const c of DIGITS + LETTERS) {
          if (c !== lei[i] && sameClass(c, lei[i])) variants.push(lei.slice(0, i) + c + lei.slice(i + 1));
        }
        const [a, b] = [lei[i], lei[i + 1]];
        if (b !== undefined && a !== b && sameClass(a, b)) {
          variants.push(lei.slice(0, i) + b + a + lei.slice(i + 2));
        }
      }
    }
    expect(variants.length).toBeGreaterThan(1000);
    expect(variants.filter(isValidLei)).toEqual([]);
  });

  it("cannot catch every digit-for-letter LEI error, by construction", () => {
    // Pinned so nobody relies on a guarantee the scheme does not give: the
    // agent's own LEI lookup (GLEIF) is the backstop for these.
    expect(isValidLei("506700GE1G29325Q3X63")).toBe(true); // "X3" → "3X"
  });

  it("reject FIGIs with vowels or a reserved prefix even when the digit sums work", () => {
    // Same check-digit arithmetic, invalid shape.
    const withVowel = "BBG000A9XRY" + figiCheckDigit("BBG000A9XRY");
    const reserved = "BMG000B9XRY" + figiCheckDigit("BMG000B9XRY");
    expect(isValidFigi(withVowel)).toBe(false);
    expect(isValidFigi(reserved)).toBe(false);
  });
});

describe("normalisation", () => {
  // The database's uniqueness rule compares stored values, so every spelling
  // of one identifier must store identically or the rule can be bypassed.
  it("stores every spelling of one identifier the same way", () => {
    expect(normaliseValue("CUSIP", " 037833-100 ")).toBe("037833100");
    expect(normaliseValue("ISIN", "us 0378 3310 05")).toBe("US0378331005");
    expect(normaliseValue("LEI", "506700ge1g29325qx363")).toBe("506700GE1G29325QX363");
    expect(normaliseValue("CIK", "320193")).toBe("0000320193");
    expect(normaliseValue("AGENT_FACILITY", "  tl-b   2031 ")).toBe("TL-B 2031");
  });
});

describe("validateIdentifier", () => {
  it("accepts and normalises a valid identifier on the right target", () => {
    expect(validateIdentifier({ target: "facility", scheme: "CUSIP", value: "037833-100" })).toEqual({
      ok: true,
      scheme: "CUSIP",
      value: "037833100",
      namespace: "",
    });
  });

  it("rejects a scheme attached at the wrong level", () => {
    const cusipOnBorrower = validateIdentifier({ target: "borrower", scheme: "CUSIP", value: "037833100" });
    const leiOnFacility = validateIdentifier({ target: "facility", scheme: "LEI", value: REAL.lei[0] });
    expect(cusipOnBorrower).toMatchObject({ ok: false, error: expect.stringContaining("not a borrower") });
    expect(leiOnFacility).toMatchObject({ ok: false, error: expect.stringContaining("not a facility") });
  });

  it("names the failing rule for a bad check digit", () => {
    const r = validateIdentifier({ target: "facility", scheme: "CUSIP", value: "037833101" });
    expect(r).toMatchObject({ ok: false, error: expect.stringContaining("not a valid CUSIP") });
  });

  it("requires a namespace exactly when the scheme is only unique per issuer", () => {
    expect(validateIdentifier({ target: "facility", scheme: "AGENT_FACILITY", value: "TL-1" }).ok).toBe(false);
    expect(
      validateIdentifier({ target: "facility", scheme: "AGENT_FACILITY", value: "TL-1", namespace: "Lumen Agency" }),
    ).toMatchObject({ ok: true, namespace: "LUMEN AGENCY" });
    expect(
      validateIdentifier({ target: "facility", scheme: "CUSIP", value: "037833100", namespace: "Anyone" }),
    ).toMatchObject({ ok: false, error: expect.stringContaining("takes no namespace") });
  });

  it("ties internal references to their target", () => {
    expect(validateIdentifier({ target: "facility", scheme: "INTERNAL", value: "fac-000142" })).toMatchObject({
      ok: true,
      value: "FAC-000142",
    });
    expect(validateIdentifier({ target: "borrower", scheme: "INTERNAL", value: "FAC-000142" }).ok).toBe(false);
  });

  it("rejects unknown schemes rather than storing them", () => {
    expect(validateIdentifier({ target: "facility", scheme: "TICKER", value: "AAPL" }).ok).toBe(false);
  });
});

describe("issuer key resolution", () => {
  const d = (s: string) => new Date(s);
  const row = (scheme: string, value: string, from: string, to: string | null = null): StoredIdentifier => ({
    scheme,
    value,
    namespace: "",
    validFrom: d(from),
    validTo: to ? d(to) : null,
  });

  it("prefers the Bloomberg company ID over the LEI", () => {
    const rows = [row("LEI", REAL.lei[1], "2020-01-01"), row("BBG_COMPANY", "101743", "2020-01-01")];
    expect(pickIssuerKey(rows, "Acme")).toEqual({ scheme: "BBG_COMPANY", value: "101743", name: "Acme" });
  });

  it("falls back to the LEI when the Bloomberg ID is retired", () => {
    const rows = [
      row("BBG_COMPANY", "101743", "2020-01-01", "2024-01-01"),
      row("LEI", REAL.lei[1], "2020-01-01"),
    ];
    expect(pickIssuerKey(rows, "Acme", d("2025-06-30"))?.scheme).toBe("LEI");
    // …but a request about 2023 still resolves the ID that was live then.
    expect(pickIssuerKey(rows, "Acme", d("2023-06-30"))?.scheme).toBe("BBG_COMPANY");
  });

  it("returns null — no coverage — when nothing Bloomberg can resolve is live", () => {
    const rows = [row("INTERNAL", "BRW-000007", "2020-01-01"), row("BBG_COMPANY", "101743", "2030-01-01")];
    expect(pickIssuerKey(rows, "Acme", d("2026-01-01"))).toBeNull();
  });

  it("answers what a tranche was called on a past date across an amend-and-extend", () => {
    const rows = [row("LOANX", "LX104412", "2023-03-01", "2025-06-30"), row("LOANX", "LX118830", "2025-06-30")];
    expect(liveAt(rows, d("2025-03-31")).map((r) => r.value)).toEqual(["LX104412"]);
    expect(liveAt(rows, d("2025-06-30")).map((r) => r.value)).toEqual(["LX118830"]);
  });
});
