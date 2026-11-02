// Check-digit algorithms for the identifier schemes that carry one.
//
// Each function takes an already-normalised value (upper-case, no separators).
// A transposed or mistyped CUSIP is the most common data-entry error in loan
// operations, and every one of these schemes catches a single-character
// change, so validating on write stops the error where it starts.

/** Character value shared by CUSIP, ISIN, LEI and FIGI: 0-9, then A=10 … Z=35. */
function charValue(c: string): number {
  const code = c.charCodeAt(0);
  if (code >= 48 && code <= 57) return code - 48;
  if (code >= 65 && code <= 90) return code - 55;
  // CUSIP alone extends the alphabet, for private placement numbers.
  if (c === "*") return 36;
  if (c === "@") return 37;
  if (c === "#") return 38;
  return NaN;
}

const sumDigits = (n: number) => {
  let s = 0;
  for (let x = n; x > 0; x = Math.floor(x / 10)) s += x % 10;
  return s;
};

/** CUSIP: "modulus 10 double-add-double" over the first eight characters. */
export function cusipCheckDigit(base8: string): number {
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    const v = charValue(base8[i]) * (i % 2 === 1 ? 2 : 1);
    sum += Math.floor(v / 10) + (v % 10);
  }
  return (10 - (sum % 10)) % 10;
}

export function isValidCusip(v: string): boolean {
  return /^[0-9A-Z*@#]{8}[0-9]$/.test(v) && cusipCheckDigit(v.slice(0, 8)) === Number(v[8]);
}

/**
 * ISIN: letters expand to two digits, then Luhn over the resulting string.
 * The digit that will sit next to the check digit is the one doubled.
 */
export function isinCheckDigit(base11: string): number {
  const digits = [...base11].map((c) => String(charValue(c))).join("");
  let sum = 0;
  for (let i = digits.length - 1, double = true; i >= 0; i--, double = !double) {
    const d = Number(digits[i]) * (double ? 2 : 1);
    sum += d > 9 ? d - 9 : d;
  }
  return (10 - (sum % 10)) % 10;
}

export function isValidIsin(v: string): boolean {
  return /^[A-Z]{2}[0-9A-Z]{9}[0-9]$/.test(v) && isinCheckDigit(v.slice(0, 11)) === Number(v[11]);
}

/** Remainder of a long digit string mod 97, without needing BigInt. */
function mod97(digits: string): number {
  let r = 0;
  for (const ch of digits) r = (r * 10 + Number(ch)) % 97;
  return r;
}

const expand = (s: string) => [...s].map((c) => String(charValue(c))).join("");

/**
 * LEI (ISO 17442): two check digits under ISO 7064 MOD 97-10. Catches every
 * digit-for-digit and letter-for-letter typo and transposition. Because letters
 * expand to two digits first, a digit-for-letter error can slip through
 * ("X3" and "3X" both expand to "333"), so a GLEIF lookup remains the backstop.
 */
export function leiCheckDigits(base18: string): string {
  return String(98 - mod97(expand(base18 + "00"))).padStart(2, "0");
}

export function isValidLei(v: string): boolean {
  return /^[0-9A-Z]{18}[0-9]{2}$/.test(v) && mod97(expand(v)) === 1;
}

/**
 * FIGI: two-letter prefix, "G", eight consonants or digits, check digit.
 * Vowels never appear, and these prefixes are reserved because they collide
 * with ISIN country codes.
 */
const FIGI_RESERVED_PREFIXES = new Set(["BS", "BM", "GG", "GB", "GH", "KY", "VG"]);
const FIGI_SHAPE = /^[B-DF-HJ-NP-TV-Z]{2}G[B-DF-HJ-NP-TV-Z0-9]{8}[0-9]$/;

export function figiCheckDigit(base11: string): number {
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    sum += sumDigits(charValue(base11[i]) * (i % 2 === 1 ? 2 : 1));
  }
  return (10 - (sum % 10)) % 10;
}

export function isValidFigi(v: string): boolean {
  return (
    FIGI_SHAPE.test(v) &&
    !FIGI_RESERVED_PREFIXES.has(v.slice(0, 2)) &&
    figiCheckDigit(v.slice(0, 11)) === Number(v[11])
  );
}
