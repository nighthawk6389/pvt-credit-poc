// Safe formula parser: tokenizer → shunting-yard → AST.
// SECURITY: never uses eval/Function. Only +, -, *, /, parens, numbers, and
// identifiers that resolve against the field library are accepted; anything
// else throws. The AST is what gets persisted and re-evaluated.

import type { Ast } from "./types";
import { isKnownField } from "./fields";

type Token =
  | { t: "num"; v: number }
  | { t: "id"; v: string }
  | { t: "op"; v: "+" | "-" | "*" | "/" }
  | { t: "lparen" }
  | { t: "rparen" };

export class FormulaError extends Error {}

export function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const s = src;
  while (i < s.length) {
    const c = s[i];
    if (c === " " || c === "\t" || c === "\n") {
      i++;
      continue;
    }
    if (c === "(") {
      tokens.push({ t: "lparen" });
      i++;
      continue;
    }
    if (c === ")") {
      tokens.push({ t: "rparen" });
      i++;
      continue;
    }
    if (c === "+" || c === "-" || c === "*" || c === "/") {
      tokens.push({ t: "op", v: c });
      i++;
      continue;
    }
    // number (supports decimals)
    if ((c >= "0" && c <= "9") || c === ".") {
      let j = i + 1;
      while (j < s.length && ((s[j] >= "0" && s[j] <= "9") || s[j] === ".")) j++;
      const num = Number(s.slice(i, j));
      if (Number.isNaN(num)) throw new FormulaError(`Invalid number near "${s.slice(i, j)}"`);
      tokens.push({ t: "num", v: num });
      i = j;
      continue;
    }
    // identifier: [A-Za-z_][A-Za-z0-9_]*
    if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;
      while (j < s.length && /[A-Za-z0-9_]/.test(s[j])) j++;
      const id = s.slice(i, j).toUpperCase();
      if (!isKnownField(id)) {
        throw new FormulaError(`Unknown field "${id}". Use a field from the library.`);
      }
      tokens.push({ t: "id", v: id });
      i = j;
      continue;
    }
    throw new FormulaError(`Unexpected character "${c}" in formula.`);
  }
  return tokens;
}

const PREC: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2 };

// Shunting-yard to RPN, tracking unary minus.
function toRpn(tokens: Token[]): Token[] {
  const out: Token[] = [];
  const ops: Token[] = [];
  let prev: Token | null = null;
  for (const tok of tokens) {
    if (tok.t === "num" || tok.t === "id") {
      out.push(tok);
    } else if (tok.t === "op") {
      // unary minus → encode as (0 - x): push a 0 first if at start/after op/lparen
      const unary =
        tok.v === "-" && (prev === null || prev.t === "op" || prev.t === "lparen");
      if (unary) out.push({ t: "num", v: 0 });
      while (
        ops.length &&
        ops[ops.length - 1].t === "op" &&
        PREC[(ops[ops.length - 1] as { v: string }).v] >= PREC[tok.v]
      ) {
        out.push(ops.pop()!);
      }
      ops.push(tok);
    } else if (tok.t === "lparen") {
      ops.push(tok);
    } else if (tok.t === "rparen") {
      while (ops.length && ops[ops.length - 1].t !== "lparen") out.push(ops.pop()!);
      if (!ops.length) throw new FormulaError("Mismatched parentheses.");
      ops.pop(); // discard lparen
    }
    prev = tok;
  }
  while (ops.length) {
    const op = ops.pop()!;
    if (op.t === "lparen") throw new FormulaError("Mismatched parentheses.");
    out.push(op);
  }
  return out;
}

function rpnToAst(rpn: Token[]): Ast {
  const stack: Ast[] = [];
  for (const tok of rpn) {
    if (tok.t === "num") stack.push({ kind: "num", value: tok.v });
    else if (tok.t === "id") stack.push({ kind: "field", code: tok.v });
    else if (tok.t === "op") {
      const right = stack.pop();
      const left = stack.pop();
      if (!left || !right) throw new FormulaError("Malformed expression.");
      stack.push({ kind: "bin", op: tok.v, left, right });
    }
  }
  if (stack.length !== 1) throw new FormulaError("Malformed expression.");
  return stack[0];
}

export function parse(src: string): Ast {
  if (!src || !src.trim()) throw new FormulaError("Formula is empty.");
  return rpnToAst(toRpn(tokenize(src)));
}

export function collectFields(ast: Ast): string[] {
  const out = new Set<string>();
  const walk = (n: Ast) => {
    if (n.kind === "field") out.add(n.code);
    else if (n.kind === "bin") {
      walk(n.left);
      walk(n.right);
    } else if (n.kind === "neg") walk(n.operand);
  };
  walk(ast);
  return [...out];
}

/** Validate a formula without throwing — for live UI feedback. */
export function validateFormula(src: string): { ok: true; fields: string[] } | { ok: false; error: string } {
  try {
    const ast = parse(src);
    return { ok: true, fields: collectFields(ast) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid formula" };
  }
}
