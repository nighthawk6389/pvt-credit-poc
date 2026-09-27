#!/usr/bin/env node
/**
 * Builds `explorer.html` — an interactive, clickable view of the canonical
 * model — from `schema.canonical.prisma` plus the hand-written page in
 * `explorer.template.html`.
 *
 *   node docs/data-model/generate-explorer.mjs     # or: npm run docs:explorer
 *
 * The template owns all the design; this script owns only the data, which it
 * injects at the `/*__GRAPH__*\/` placeholder. Keeping them apart means the
 * page can be edited by hand without touching a generator, and the graph can
 * be regenerated without touching the design.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parseSchema, plural } from "./parse-prisma.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, "schema.canonical.prisma");
const TEMPLATE = join(here, "explorer.template.html");
const OUT = join(here, "explorer.html");

const { enums, models } = parseSchema(SRC);
const byName = new Map(models.map((m) => [m.name, m]));

// ── domains, from the `// ═══ N. TITLE ═══` banners in the source ──────────
const domains = [];
for (const m of models) {
  const label = m.section ?? "Uncategorised";
  let d = domains.find((x) => x.raw === label);
  if (!d) {
    const n = /^(\d+)\./.exec(label);
    d = { n: n ? Number(n[1]) : domains.length + 1, raw: label, label: titleCase(label), entities: [] };
    domains.push(d);
  }
  d.entities.push(m.name);
  m._domain = d.n;
}
function titleCase(label) {
  return label
    .replace(/^\d+\.\s*/, "")
    .toLowerCase()
    .replace(/(^|[\s&(/-])([a-z])/g, (_, a, b) => a + b.toUpperCase())
    .replace(/\bIc\b/g, "IC")
    .replace(/\bKpi\b/g, "KPI");
}

// ── type display, exactly as a reader of the schema would write it ─────────
function typeOf(f) {
  let base = f.baseType;
  if (f.baseType === "Decimal" && f.decimal) base = `Decimal(${f.decimal.precision},${f.decimal.scale})`;
  return base + (f.isList ? "[]" : "") + (f.optional ? "?" : "");
}
function typeKind(f) {
  if (f.isEnum) return "enum";
  if (f.baseType === "Decimal") return "decimal";
  if (f.baseType === "Json") return "json";
  if (f.baseType === "DateTime") return "date";
  return "scalar";
}

// ── relationships: one row per scalar foreign key ─────────────────────────
// A Prisma relation has two sides. The side carrying `fields:` owns the FK
// column; the other side is a back-reference. Only the owning side is a real
// edge, so that is what gets walked here — and the back-reference's field name
// is looked up so the incoming list can say which navigation it is.
const out = new Map();  // model -> edges it owns
const inn = new Map();  // model -> edges pointing at it
for (const m of models) {
  out.set(m.name, []);
  inn.set(m.name, []);
}

for (const m of models) {
  for (const f of m.fields) {
    if (!f.isRelation || !f.relation?.fields.length) continue;
    if (f.relation.fields.length !== 1) continue; // canonical model has none
    const target = byName.get(f.baseType);
    if (!target) continue;
    const fk = m.fields.find((x) => x.name === f.relation.fields[0]);
    const targetField = f.relation.references[0];
    const back = target.fields.find(
      (x) =>
        x.isRelation &&
        x.baseType === m.name &&
        !x.relation?.fields.length &&
        (f.relation.relationName ? x.relation?.relationName === f.relation.relationName : true),
    );
    const edge = {
      source: m.name,
      sourceDomain: m._domain,
      target: target.name,
      targetDomain: target._domain,
      targetField,
      fk: f.relation.fields[0],
      via: f.name,
      back: back ? back.name : null,
      onDelete: f.relation.onDelete,
      optional: Boolean(fk?.optional),
      // A unique FK column means the pair is 1:1 rather than many:1.
      one: Boolean(fk?.isUnique),
      self: target.name === m.name,
      doc: fk?.doc ?? f.doc ?? null,
    };
    out.get(m.name).push(edge);
    inn.get(target.name).push(edge);
  }
}
const relationshipCount = [...out.values()].reduce((n, e) => n + e.length, 0);

// ── traits: scannable badges, each derived from the schema itself ──────────
const HISTORY_RE = /append-only|immutable|never updated|over time|history|effective-dated|migration|event stream|audit trail/i;
function traitsOf(m) {
  const t = [];
  const text = [m.doc, ...m.fields.map((f) => f.doc)].filter(Boolean).join(" ");
  if (HISTORY_RE.test(text)) t.push("history");
  if (m.fields.some((f) => f.name === "orgId")) t.push("tenant");
  if (m.fields.some((f) => f.baseType === "Decimal")) t.push("money");
  if (m.fields.some((f) => f.baseType === "Json")) t.push("json");
  return t;
}

// ── enum usage, so an enum can be dived into like an entity ────────────────
const enumUsage = new Map(enums.map((e) => [e.name, []]));
for (const m of models) {
  for (const f of m.fields) {
    if (f.isEnum) enumUsage.get(f.baseType)?.push({ entity: m.name, field: f.name });
  }
}

// ── assemble ──────────────────────────────────────────────────────────────
const entities = {};
let fieldCount = 0;
for (const m of models) {
  const fkByColumn = new Map(out.get(m.name).map((e) => [e.fk, e]));
  const fields = m.fields
    .filter((f) => !f.isRelation)
    .map((f) => {
      fieldCount++;
      const edge = fkByColumn.get(f.name);
      return {
        name: f.name,
        type: typeOf(f),
        kind: edge ? "fk" : typeKind(f),
        optional: f.optional,
        isId: f.isId,
        isUnique: f.isUnique,
        isUpdatedAt: f.isUpdatedAt,
        default: f.default,
        doc: f.doc,
        note: f.note,
        enumRef: f.isEnum ? f.baseType : null,
        fk: edge ? { target: edge.target, targetField: edge.targetField } : null,
      };
    });
  entities[m.name] = {
    name: m.name,
    collection: plural(m.name),
    domain: m._domain,
    subsection: m.subsection,
    doc: m.doc,
    traits: traitsOf(m),
    fields,
    out: out.get(m.name),
    in: inn.get(m.name),
    unique: m.constraints.filter((c) => c.kind === "unique").map((c) => cols(c.args)),
    indexes: m.constraints.filter((c) => c.kind === "index").map((c) => cols(c.args)),
  };
}
function cols(args) {
  const m = /\[([^\]]*)\]/.exec(args);
  return (m ? m[1] : args).split(",").map((s) => s.trim()).filter(Boolean);
}

const enumsOut = {};
for (const e of enums) {
  enumsOut[e.name] = { name: e.name, doc: e.doc, values: e.values.map((v) => v.name), usedBy: enumUsage.get(e.name) };
}

const graph = {
  source: "schema.canonical.prisma",
  domains: domains.sort((a, b) => a.n - b.n),
  entities,
  enums: enumsOut,
  stats: {
    entities: models.length,
    enums: enums.length,
    relationships: relationshipCount,
    fields: fieldCount,
    domains: domains.length,
  },
};

const template = readFileSync(TEMPLATE, "utf8");
const marker = "/*__GRAPH__*/";
if (!template.includes(marker)) {
  throw new Error(`explorer.template.html is missing the ${marker} placeholder`);
}
const html = template.replace(
  marker,
  JSON.stringify(graph).replace(/</g, "\\u003c").replace(/>/g, "\\u003e"),
);
writeFileSync(OUT, html, "utf8");
console.log(
  `wrote ${OUT}\n  ${graph.stats.entities} entities, ${graph.stats.enums} enums, ` +
    `${graph.stats.relationships} relationships, ${graph.stats.fields} fields, ` +
    `${graph.stats.domains} domains`,
);
