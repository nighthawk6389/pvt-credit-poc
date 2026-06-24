import { describe, it, expect } from "vitest";
import {
  parse,
  validateFormula,
  collectFields,
  evaluate,
  FormulaError,
} from "@/lib/covenants/index";
import { makeDef } from "./helpers";

// Area 6: parser is the security boundary the rest of the engine trusts. It must
// reject unknown fields and illegal characters (no eval), and accepted formulas
// must yield exactly the field set the engine will resolve. We assert both the
// rejection contract (validateFormula + parse) AND that collectFields matches
// what evaluate actually reads.

describe("parser safety / field-library contract", () => {
  it("rejects unknown field references", () => {
    const res = validateFormula("EBITDA_ADJ / MADE_UP_FIELD");
    expect(res.ok).toBe(false);
    expect(() => parse("EBITDA_ADJ / MADE_UP_FIELD")).toThrow(FormulaError);
  });

  it("rejects illegal characters / code-injection attempts (never evals)", () => {
    for (const bad of [
      "EBITDA_ADJ ; DROP TABLE",
      "process.exit(1)",
      "EBITDA_ADJ ** 2",
      "EBITDA_ADJ % INT_EXP",
      "console.log(1)",
    ]) {
      const res = validateFormula(bad);
      expect(res.ok, `expected rejection of: ${bad}`).toBe(false);
    }
  });

  it("rejects structurally malformed expressions", () => {
    for (const bad of ["", "   ", "(EBITDA_ADJ", "EBITDA_ADJ )", "EBITDA_ADJ +", "/ EBITDA_ADJ"]) {
      expect(validateFormula(bad).ok, `expected rejection of: "${bad}"`).toBe(false);
    }
  });

  it("accepts valid library formulas and reports the exact field set", () => {
    const res = validateFormula("(TOT_DEBT - CASH) / EBITDA_ADJ");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(new Set(res.fields)).toEqual(new Set(["TOT_DEBT", "CASH", "EBITDA_ADJ"]));
    }
  });

  it("the collected field set equals the fields the engine actually consumes", () => {
    // Derived fields (NET_DEBT) resolve via their own formula; the surface field
    // set the parser collects must align with what evaluate reads/needs.
    const formula = "NET_DEBT / EBITDA_ADJ";
    const fields = collectFields(parse(formula));
    expect(new Set(fields)).toEqual(new Set(["NET_DEBT", "EBITDA_ADJ"]));

    // NET_DEBT derives as TOT_DEBT - CASH, so evaluate resolves it recursively
    // without it being in the facts — proving the contract holds end-to-end.
    const def = makeDef({ name: "Lev via derived", formula, operator: "<=", threshold: 5.75 });
    const r = evaluate(def, { TOT_DEBT: 200, CASH: 24, EBITDA_ADJ: 40 }, new Date("2025-12-31"));
    expect(r.value as number).toBeCloseTo((200 - 24) / 40, 6);
    expect(r.missing).toEqual([]); // NET_DEBT not reported, but derivable → not missing
  });

  it("a formula whose surface field has no fact is reported missing (not silently zero)", () => {
    const def = makeDef({ name: "Coverage", formula: "EBITDA_ADJ / INT_EXP", operator: ">=", threshold: 2 });
    const r = evaluate(def, { EBITDA_ADJ: 40 }, new Date("2025-12-31")); // INT_EXP absent
    expect(r.missing).toContain("INT_EXP");
    expect(r.value).toBeNull();
    expect(r.pass).toBe(false);
  });
});
