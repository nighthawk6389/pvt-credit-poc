// The financial field library — Bloomberg-style mnemonics covenant formulas
// reference. Derived fields carry a `derive` formula evaluated by the same engine.

export interface FieldDef {
  code: string;
  label: string;
  unit: "x" | "$MM" | "%";
  category: "PnL" | "BalanceSheet" | "CashFlow" | "Derived";
  derive?: string; // formula over other fields, e.g. "TOT_DEBT - CASH"
  bbg?: string; // the real Bloomberg field this maps to (documentation)
}

export const FIELD_LIBRARY: Record<string, FieldDef> = {
  SALES_REV_TURN: { code: "SALES_REV_TURN", label: "Revenue (LTM)", unit: "$MM", category: "PnL", bbg: "SALES_REV_TURN" },
  EBITDA: { code: "EBITDA", label: "EBITDA (reported, LTM)", unit: "$MM", category: "PnL", bbg: "EBITDA" },
  EBITDA_ADJ: { code: "EBITDA_ADJ", label: "Adjusted EBITDA (LTM)", unit: "$MM", category: "Derived", bbg: "EBITDA_ADJUSTED" },
  TOT_DEBT: { code: "TOT_DEBT", label: "Total Debt", unit: "$MM", category: "BalanceSheet", bbg: "SHORT_AND_LONG_TERM_DEBT" },
  SR_DEBT: { code: "SR_DEBT", label: "Senior Secured Debt", unit: "$MM", category: "BalanceSheet" },
  CASH: { code: "CASH", label: "Cash & Equivalents", unit: "$MM", category: "BalanceSheet", bbg: "BS_CASH_NEAR_CASH_ITEM" },
  NET_DEBT: { code: "NET_DEBT", label: "Net Debt", unit: "$MM", category: "Derived", derive: "TOT_DEBT - CASH", bbg: "NET_DEBT" },
  INT_EXP: { code: "INT_EXP", label: "Cash Interest Expense (LTM)", unit: "$MM", category: "PnL", bbg: "IS_INT_EXPENSE" },
  CAPEX: { code: "CAPEX", label: "Capex (LTM)", unit: "$MM", category: "CashFlow", bbg: "CAPITAL_EXPEND" },
  FIXED_CHARGES: { code: "FIXED_CHARGES", label: "Fixed Charges (int + amort + tax)", unit: "$MM", category: "PnL" },
  SCHED_AMORT: { code: "SCHED_AMORT", label: "Scheduled Amortization (LTM)", unit: "$MM", category: "CashFlow" },
  RCF_AVAILABLE: { code: "RCF_AVAILABLE", label: "Revolver Availability", unit: "$MM", category: "BalanceSheet" },
  RCF_UTIL_PCT: { code: "RCF_UTIL_PCT", label: "Revolver Utilization", unit: "%", category: "BalanceSheet" },
};

export function isKnownField(code: string): boolean {
  return code in FIELD_LIBRARY;
}

/** Standard ratio templates offered one-click in the formula builder. */
export interface RatioTemplate {
  name: string;
  category: "Maintenance" | "Springing" | "Incurrence";
  formula: string;
  operator: "<=" | ">=";
  unit: "x" | "$MM" | "%";
  threshold: number;
}

export const RATIO_TEMPLATES: RatioTemplate[] = [
  { name: "Total Net Leverage", category: "Maintenance", formula: "(TOT_DEBT - CASH) / EBITDA_ADJ", operator: "<=", unit: "x", threshold: 5.75 },
  { name: "Senior Secured Leverage", category: "Maintenance", formula: "SR_DEBT / EBITDA_ADJ", operator: "<=", unit: "x", threshold: 4.0 },
  { name: "Fixed Charge Coverage", category: "Maintenance", formula: "(EBITDA_ADJ - CAPEX) / FIXED_CHARGES", operator: ">=", unit: "x", threshold: 1.5 },
  { name: "Interest Coverage", category: "Maintenance", formula: "EBITDA_ADJ / INT_EXP", operator: ">=", unit: "x", threshold: 2.0 },
  { name: "Minimum Liquidity", category: "Maintenance", formula: "CASH + RCF_AVAILABLE", operator: ">=", unit: "$MM", threshold: 10 },
  { name: "Minimum EBITDA", category: "Maintenance", formula: "EBITDA_ADJ", operator: ">=", unit: "$MM", threshold: 30 },
  { name: "Maximum Capex", category: "Incurrence", formula: "CAPEX", operator: "<=", unit: "$MM", threshold: 18 },
  { name: "Incurrence — Net Leverage", category: "Incurrence", formula: "(TOT_DEBT - CASH) / EBITDA_ADJ", operator: "<=", unit: "x", threshold: 4.5 },
];

/** The EBITDA-style field a covenant scales by (used by break-even solver). */
export const EBITDA_FIELDS = ["EBITDA_ADJ", "EBITDA"];
