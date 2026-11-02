// The identifier schemes the deal room stores, and where each one may live.
//
// An identifier belongs at its real level. An LEI names the legal entity that
// borrows; a CUSIP names a facility. Putting a CUSIP on a borrower is a
// modelling error, so the validator rejects any scheme on a target it does
// not belong to.

export const ID_TARGETS = ["borrower", "facility"] as const;
export type IdTarget = (typeof ID_TARGETS)[number];

export const ID_SCHEMES = [
  "INTERNAL",
  "LEI",
  "BBG_COMPANY",
  "CIK",
  "CUSIP",
  "ISIN",
  "FIGI",
  "LOANX",
  "AGENT_FACILITY",
  "CLEARPAR",
  "WSO",
  "OTHER",
] as const;
export type IdScheme = (typeof ID_SCHEMES)[number];

/** Where an identifier came from — so a mismatch can be traced to its source. */
export const ID_SOURCES = [
  "INTERNAL",
  "AGENT_NOTICE",
  "BLOOMBERG",
  "MARKIT",
  "CUSIP_GLOBAL",
  "GLEIF",
  "SEC",
  "MANUAL",
] as const;
export type IdSource = (typeof ID_SOURCES)[number];

export interface SchemeSpec {
  label: string;
  targets: readonly IdTarget[];
  /**
   * Unique only inside one issuer's own system (an agent's facility reference,
   * a WSO instance), so the issuer is part of the identity.
   */
  namespaced: boolean;
  /** What a reader should know about it. */
  about: string;
}

export const SCHEME_SPECS: Record<IdScheme, SchemeSpec> = {
  INTERNAL: {
    label: "Internal ref",
    targets: ["borrower", "facility"],
    namespaced: false,
    about: "Our own quotable reference (BRW-000123, FAC-000142) — exists before any external identifier does.",
  },
  LEI: {
    label: "LEI",
    targets: ["borrower"],
    namespaced: false,
    about: "ISO 17442 Legal Entity Identifier of the borrower of record.",
  },
  BBG_COMPANY: {
    label: "Bloomberg company ID",
    targets: ["borrower"],
    namespaced: false,
    about: "Bloomberg's numeric company identifier; the key for FA, DRSK and CRPR.",
  },
  CIK: {
    label: "SEC CIK",
    targets: ["borrower"],
    namespaced: false,
    about: "SEC Central Index Key, for borrowers with public filings.",
  },
  CUSIP: {
    label: "CUSIP",
    targets: ["facility"],
    namespaced: false,
    about: "Nine-character security identifier; often obtained so a loan can be held by a CLO.",
  },
  ISIN: {
    label: "ISIN",
    targets: ["facility"],
    namespaced: false,
    about: "ISO 6166 international security identifier; embeds the CUSIP for US instruments.",
  },
  FIGI: {
    label: "FIGI",
    targets: ["facility"],
    namespaced: false,
    about: "Financial Instrument Global Identifier (OpenFIGI).",
  },
  LOANX: {
    label: "LoanX ID",
    targets: ["facility"],
    namespaced: false,
    about: "Markit (S&P) loan identifier, used for marks and loan-market data.",
  },
  AGENT_FACILITY: {
    label: "Agent facility ref",
    targets: ["facility"],
    namespaced: true,
    about: "The administrative agent's own reference; unique only within that agent.",
  },
  CLEARPAR: {
    label: "ClearPar ID",
    targets: ["facility"],
    namespaced: false,
    about: "Loan settlement platform identifier.",
  },
  WSO: {
    label: "WSO ID",
    targets: ["facility"],
    namespaced: true,
    about: "Wall Street Office loan-administration ID; unique only within one WSO instance.",
  },
  OTHER: {
    label: "Other",
    targets: ["borrower", "facility"],
    namespaced: true,
    about: "Anything else; the namespace says what it is.",
  },
};

/** Prefix of an INTERNAL reference for each target. */
export const INTERNAL_PREFIX: Record<IdTarget, string> = {
  borrower: "BRW",
  facility: "FAC",
};

/** The order identifiers are shown in: the ones people quote first. */
export const DISPLAY_ORDER: readonly IdScheme[] = [
  "CUSIP",
  "LOANX",
  "ISIN",
  "FIGI",
  "LEI",
  "BBG_COMPANY",
  "CIK",
  "AGENT_FACILITY",
  "CLEARPAR",
  "WSO",
  "INTERNAL",
  "OTHER",
];

export const isIdScheme = (s: string): s is IdScheme => (ID_SCHEMES as readonly string[]).includes(s);
export const isIdSource = (s: string): s is IdSource => (ID_SOURCES as readonly string[]).includes(s);
