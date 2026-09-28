#!/usr/bin/env node
/**
 * Generates `schema.canonical.xsd` from `schema.canonical.prisma`.
 *
 * The XSD is a *reading* projection of the canonical model: one global
 * complexType per Prisma model, one simpleType per enum, and root-level
 * xs:key / xs:keyref pairs that mirror the relational foreign keys. It is
 * generated rather than hand-written so the two files cannot drift.
 *
 *   node docs/data-model/generate-xsd.mjs
 *
 * Mapping rules:
 *   - Relation (navigation) fields are dropped; the scalar FK column they
 *     map to is kept, and becomes an xs:keyref.
 *   - Decimal(p,s) maps to a named simpleType carrying totalDigits /
 *     fractionDigits, so money never degrades to a float.
 *   - Optional (`?`) fields become minOccurs="0".
 *   - `///` doc comments and trailing `//` notes become xs:documentation.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parseSchema, plural } from "./parse-prisma.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, "schema.canonical.prisma");
const OUT = join(here, "schema.canonical.xsd");
const NS = "urn:lumen:private-credit-deal-room:1.0";

const { enums, models, enumNames } = parseSchema(SRC);

// ── decimal simpleTypes ───────────────────────────────────────────────────
const DECIMAL_NAMES = {
  "20,4": ["Money", "Monetary amount. Always paired with a currency on the same record."],
  "18,6": ["Ratio", "A multiple or ratio, e.g. a leverage covenant level of 5.250000x."],
  "9,4": ["Percent", "A percentage expressed in percent units (12.5000 means 12.5%), not a fraction. A handful of source fields reuse this precision for small multiples rather than percentages (notably ReturnSnapshot.moic) \u2014 read the owning field's own documentation."],
  "24,6": ["MetricValue", "Generic dashboard metric value — wide enough for aggregate currency amounts."],
  "9,6": ["RatePercent", "An interest rate in percent units, to six decimals."],
  "18,8": ["FxFactor", "An FX conversion factor."],
};
const decimalTypes = new Map();
for (const m of models) {
  for (const f of m.fields) {
    if (f.baseType !== "Decimal") continue;
    const key = f.decimal ? `${f.decimal.precision},${f.decimal.scale}` : "20,4";
    if (!decimalTypes.has(key)) {
      const [p, s] = key.split(",");
      const named = DECIMAL_NAMES[key];
      decimalTypes.set(key, {
        name: named ? named[0] : `Decimal${p}_${s}`,
        doc: named ? named[1] : `Fixed-point decimal with ${p} total digits and ${s} decimal places.`,
        precision: Number(p),
        scale: Number(s),
      });
    }
  }
}
function decimalTypeName(f) {
  const key = f.decimal ? `${f.decimal.precision},${f.decimal.scale}` : "20,4";
  return decimalTypes.get(key).name;
}

// ── type mapping ──────────────────────────────────────────────────────────
function xsdType(f) {
  switch (f.baseType) {
    case "String": return "xs:string";
    case "Int": return "xs:int";
    case "BigInt": return "xs:long";
    case "Boolean": return "xs:boolean";
    case "DateTime": return "xs:dateTime";
    case "Float": return "xs:double";
    case "Json": return "pc:Json";
    case "Decimal": return `pc:${decimalTypeName(f)}`;
    default:
      if (enumNames.has(f.baseType)) return `pc:${f.baseType}`;
      return "xs:string";
  }
}

// ── foreign keys ──────────────────────────────────────────────────────────
// target key -> { model, field }; and one keyref per single-column relation.
const keyTargets = new Map();
const keyrefs = [];
for (const m of models) {
  for (const f of m.fields) {
    if (!f.isRelation || !f.relation) continue;
    if (f.relation.fields.length !== 1 || f.relation.references.length !== 1) continue;
    const target = f.baseType;
    const targetField = f.relation.references[0];
    const fk = f.relation.fields[0];
    if (!models.some((x) => x.name === target)) continue;
    const tkey = `${target}.${targetField}`;
    if (!keyTargets.has(tkey)) keyTargets.set(tkey, { model: target, field: targetField });
    keyrefs.push({ model: m.name, fk, target, targetField, via: f.name });
  }
}
// Always key every model on its own @id, so the XSD asserts primary keys too.
for (const m of models) {
  const idField = m.fields.find((f) => f.isId);
  if (idField) {
    const tkey = `${m.name}.${idField.name}`;
    if (!keyTargets.has(tkey)) keyTargets.set(tkey, { model: m.name, field: idField.name });
  }
}
const keyName = (model, field) => `key_${model}_${field}`;

// ── emit ──────────────────────────────────────────────────────────────────
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function docBlock(indent, parts) {
  const text = parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  if (!text) return [];
  return [
    `${indent}<xs:annotation>`,
    `${indent}  <xs:documentation>${esc(text)}</xs:documentation>`,
    `${indent}</xs:annotation>`,
  ];
}

const out = [];
const w = (...parts) => (parts.length ? out.push(...parts) : out.push(""));
// Writes an annotation block only when there is something to say.
const wDoc = (indent, parts) => {
  const block = docBlock(indent, parts);
  if (block.length) out.push(...block);
};

w(`<?xml version="1.0" encoding="UTF-8"?>`);
w(`<!--`);
w(`  ===========================================================================`);
w(`  CANONICAL DATA MODEL — Private Credit Deal Room & Dashboard (XSD view)`);
w(`  ===========================================================================`);
w(`  GENERATED FILE — do not edit by hand.`);
w(`    source:    docs/data-model/schema.canonical.prisma`);
w(`    generator: docs/data-model/generate-xsd.mjs   (node generate-xsd.mjs)`);
w(``);
w(`  This is a reading/interchange projection of the canonical model: ${models.length} entity`);
w(`  types, ${enums.length} enumerations, and root-level key/keyref pairs mirroring the`);
w(`  relational foreign keys. Validating an instance therefore checks referential`);
w(`  integrity, not just shape.`);
w(``);
w(`  Conventions carried over from the source model:`);
w(`    * Money is fixed-point decimal (never float) and always travels with a`);
w(`      currency on the same record.`);
w(`    * Anything trended over time is an event type, not a mutable scalar`);
w(`      (stage, rating, pricing, marks, document versions).`);
w(`    * Every actor is a reference to a User — no free-text name strings.`);
w(`    * Root aggregates carry orgId (multi-tenant).`);
w(``);
w(`  Relation/navigation fields are intentionally absent: only the scalar`);
w(`  foreign-key elements appear, each backed by an xs:keyref below.`);
w(`  ===========================================================================`);
w(`-->`);
w(`<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"`);
w(`           xmlns:pc="${NS}"`);
w(`           targetNamespace="${NS}"`);
w(`           elementFormDefault="qualified"`);
w(`           version="1.0">`);
w(``);

// shared simple/complex helper types
w(`  <!-- ══════════════════════ SHARED VALUE TYPES ══════════════════════ -->`);
w(``);
w(`  <xs:simpleType name="Cuid">`);
wDoc("    ", ["Surrogate primary key (cuid in the source model): an opaque identifier, never parsed for meaning."]);
w(`    <xs:restriction base="xs:string">`);
w(`      <xs:minLength value="1"/>`);
w(`      <xs:maxLength value="64"/>`);
w(`    </xs:restriction>`);
w(`  </xs:simpleType>`);
w(``);
for (const d of [...decimalTypes.values()].sort((a, b) => a.name.localeCompare(b.name))) {
  w(`  <xs:simpleType name="${d.name}">`);
  wDoc("    ", [d.doc, `Decimal(${d.precision},${d.scale}).`]);
  w(`    <xs:restriction base="xs:decimal">`);
  w(`      <xs:totalDigits value="${d.precision}"/>`);
  w(`      <xs:fractionDigits value="${d.scale}"/>`);
  w(`    </xs:restriction>`);
  w(`  </xs:simpleType>`);
  w(``);
}
w(`  <xs:complexType name="Json" mixed="true">`);
wDoc("    ", ["Opaque JSON payload (formula ASTs, saved-view filters, audit before/after snapshots). Carried as text, or as arbitrary lax-validated child elements for readability."]);
w(`    <xs:sequence>`);
w(`      <xs:any namespace="##any" processContents="lax" minOccurs="0" maxOccurs="unbounded"/>`);
w(`    </xs:sequence>`);
w(`  </xs:complexType>`);
w(``);

// enums
w(`  <!-- ════════════════════════ ENUMERATIONS ═════════════════════════ -->`);
w(``);
for (const e of enums) {
  w(`  <xs:simpleType name="${e.name}">`);
  wDoc("    ", [e.doc]);
  w(`    <xs:restriction base="xs:string">`);
  for (const v of e.values) w(`      <xs:enumeration value="${v.name}"/>`);
  w(`    </xs:restriction>`);
  w(`  </xs:simpleType>`);
  w(``);
}

// entity complexTypes, grouped by source section
w(`  <!-- ═════════════════════════ ENTITY TYPES ════════════════════════ -->`);
w(``);
let lastSection = null;
let lastSub = null;
for (const m of models) {
  if (m.section !== lastSection) {
    w(`  <!-- ${"═".repeat(6)} ${m.section ?? "MODEL"} ${"═".repeat(Math.max(6, 62 - (m.section ?? "").length))} -->`);
    w(``);
    lastSection = m.section;
    lastSub = null;
  }
  if (m.subsection && m.subsection !== lastSub) {
    w(`  <!-- ${m.subsection} -->`);
    w(``);
    lastSub = m.subsection;
  }

  const pk = m.fields.find((f) => f.isId);
  const uniques = m.constraints.filter((c) => c.kind === "unique").map((c) => `(${c.args.replace(/[\[\]]/g, "")})`);
  w(`  <xs:complexType name="${m.name}">`);
  wDoc("    ", [
    m.doc,
    uniques.length ? `Unique: ${uniques.join(", ")}.` : null,
  ]);
  w(`    <xs:sequence>`);
  for (const f of m.fields) {
    if (f.isRelation) continue; // navigation only — the FK element carries it
    const type = f.isId || pointsAtSurrogateKey(m.name, f.name) ? "pc:Cuid" : xsdType(f);
    const attrs = [`name="${f.name}"`, `type="${type}"`];
    if (f.optional) attrs.push(`minOccurs="0"`);
    if (f.isList) attrs.push(`minOccurs="0"`, `maxOccurs="unbounded"`);
    if (f.default != null && f.baseType !== "Json") attrs.push(`default="${esc(f.default)}"`);
    const notes = [
      f.doc,
      f.note ? `Note: ${f.note}.` : null,
      f.isId ? "Primary key." : null,
      f.isUnique && !f.isId ? "Unique." : null,
      f.isUpdatedAt ? "Maintained by the write path on every update." : null,
      f.default != null ? `Defaults to ${f.default}.` : null,
      fkDoc(m.name, f.name),
    ];
    const body = docBlock("        ", notes);
    if (body.length === 0) {
      w(`      <xs:element ${attrs.join(" ")}/>`);
    } else {
      w(`      <xs:element ${attrs.join(" ")}>`);
      w(...body);
      w(`      </xs:element>`);
    }
  }
  w(`    </xs:sequence>`);
  w(`  </xs:complexType>`);
  w(``);
  void pk;
}

/** True when this scalar column is an FK onto another model's @id. */
function pointsAtSurrogateKey(modelName, fieldName) {
  return keyrefs.some((k) => {
    if (k.model !== modelName || k.fk !== fieldName) return false;
    const target = models.find((x) => x.name === k.target);
    return Boolean(target?.fields.find((f) => f.isId && f.name === k.targetField));
  });
}

function fkDoc(modelName, fieldName) {
  const hits = keyrefs.filter((k) => k.model === modelName && k.fk === fieldName);
  if (hits.length === 0) return null;
  return `Foreign key → ${hits.map((h) => `${h.target}.${h.targetField}`).join(" / ")}.`;
}

// root document element
w(`  <!-- ══════════════════════ DOCUMENT ELEMENT ═══════════════════════ -->`);
w(``);
w(`  <xs:element name="DealRoomDataset">`);
wDoc("    ", [
  "A complete (or partial) extract of the deal room. Each child is a collection of one entity type; all are optional so a document can carry a single slice, e.g. just covenant definitions and tests. The key/keyref constraints below hold across the whole document, so an extract must include the rows it references.",
]);
w(`    <xs:complexType>`);
w(`      <xs:sequence>`);
for (const m of models) {
  const coll = plural(m.name);
  w(`        <xs:element name="${coll}" minOccurs="0">`);
  w(`          <xs:complexType>`);
  w(`            <xs:sequence>`);
  w(`              <xs:element name="${m.name}" type="pc:${m.name}" minOccurs="0" maxOccurs="unbounded"/>`);
  w(`            </xs:sequence>`);
  w(`          </xs:complexType>`);
  w(`        </xs:element>`);
}
w(`      </xs:sequence>`);
w(`    </xs:complexType>`);
w(``);
w(`    <!-- Primary keys and the unique columns other records point at. -->`);
for (const t of [...keyTargets.values()].sort((a, b) => (a.model + a.field).localeCompare(b.model + b.field))) {
  w(`    <xs:key name="${keyName(t.model, t.field)}">`);
  w(`      <xs:selector xpath="pc:${plural(t.model)}/pc:${t.model}"/>`);
  w(`      <xs:field xpath="pc:${t.field}"/>`);
  w(`    </xs:key>`);
}
w(``);
w(`    <!-- Foreign keys: ${keyrefs.length} references, mirroring the relational model. -->`);
const seenRef = new Set();
for (const k of keyrefs.slice().sort((a, b) => (a.model + a.fk).localeCompare(b.model + b.fk))) {
  const name = `fk_${k.model}_${k.fk}`;
  if (seenRef.has(name)) continue;
  seenRef.add(name);
  w(`    <xs:keyref name="${name}" refer="pc:${keyName(k.target, k.targetField)}">`);
  w(`      <xs:selector xpath="pc:${plural(k.model)}/pc:${k.model}"/>`);
  w(`      <xs:field xpath="pc:${k.fk}"/>`);
  w(`    </xs:keyref>`);
}
w(`  </xs:element>`);
w(``);
w(`</xs:schema>`);

writeFileSync(OUT, out.join("\n") + "\n", "utf8");
console.log(
  `wrote ${OUT}\n  ${models.length} entity types, ${enums.length} enums, ` +
    `${keyTargets.size} keys, ${seenRef.size} foreign keys`,
);
