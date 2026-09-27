/**
 * A small, purpose-built reader for `schema.canonical.prisma`.
 *
 * Shared by the two generators in this directory (`generate-xsd.mjs` and
 * `generate-explorer.mjs`) so they always describe the same model. It is not a
 * general Prisma parser — it understands exactly the constructs the canonical
 * schema uses, and it deliberately keeps the things a schema tool usually
 * throws away: the `///` doc comments, the trailing `//` notes, and the
 * `// ═══ N. SECTION ═══` banners that group the file into domains.
 */
import { readFileSync } from "node:fs";

const PLURAL_OVERRIDES = { Collateral: "CollateralItems" };

/** Collection name for a model — used as the XSD element and the UI label. */
export function plural(name) {
  if (PLURAL_OVERRIDES[name]) return PLURAL_OVERRIDES[name];
  if (/[^aeiou]y$/.test(name)) return name.slice(0, -1) + "ies";
  if (/(s|x|z|ch|sh)$/.test(name)) return name + "es";
  return name + "s";
}

function tidyBanner(s) {
  return s.replace(/\s+/g, " ").trim();
}
function readDecimal(attrs) {
  const m = /@db\.Decimal\((\d+)\s*,\s*(\d+)\)/.exec(attrs);
  return m ? { precision: Number(m[1]), scale: Number(m[2]) } : null;
}
function readDefault(attrs) {
  const m = /@default\(([^()]*(?:\([^()]*\)[^()]*)*)\)/.exec(attrs);
  if (!m) return null;
  const v = m[1].trim();
  if (/^(now|cuid|uuid|autoincrement|dbgenerated)\s*\(/.test(v)) return null;
  if (/^".*"$/.test(v)) return v.slice(1, -1);
  return v;
}
function readRelation(attrs) {
  if (!/@relation\(/.test(attrs)) return null;
  const named = /@relation\(\s*"([^"]+)"/.exec(attrs);
  const onDelete = /onDelete:\s*(\w+)/.exec(attrs);
  const fields = /fields:\s*\[([^\]]*)\]/.exec(attrs);
  const refs = /references:\s*\[([^\]]*)\]/.exec(attrs);
  const split = (m) => (m ? m[1].split(",").map((s) => s.trim()).filter(Boolean) : []);
  return {
    relationName: named ? named[1] : null,
    onDelete: onDelete ? onDelete[1] : null,
    fields: split(fields),
    references: split(refs),
  };
}

/**
 * @param {string} srcPath absolute path to the .prisma file
 * @returns {{ enums: object[], models: object[], enumNames: Set<string>, modelNames: Set<string> }}
 */
export function parseSchema(srcPath) {
  const lines = readFileSync(srcPath, "utf8").split("\n");

  // pass 1 — which names are enums and which are models, so a field's type
  // can be classified before its own declaration is reached.
  const enumNames = new Set();
  const modelNames = new Set();
  for (const line of lines) {
    const e = /^enum\s+(\w+)\s*\{/.exec(line);
    if (e) enumNames.add(e[1]);
    const m = /^model\s+(\w+)\s*\{/.exec(line);
    if (m) modelNames.add(m[1]);
  }

  // pass 2 — blocks, fields, comments, banners
  const enums = [];
  const models = [];
  let section = null;
  let subsection = null;
  let doc = [];
  let cur = null;

  const flushDoc = () => {
    const d = doc.join(" ").trim();
    doc = [];
    return d || null;
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) { if (!cur) doc = []; continue; }

    const banner = /^\/\/\s*═+\s*(\d+\.\s*.+?)\s*═+$/.exec(line);
    if (banner) { section = tidyBanner(banner[1]); subsection = null; doc = []; continue; }
    const sub = /^\/\/\s*─+\s*(.+?)\s*─+$/.exec(line);
    if (sub) { subsection = tidyBanner(sub[1]); doc = []; continue; }

    const tripleSlash = /^\s*\/\/\/\s?(.*)$/.exec(line);
    if (tripleSlash) { doc.push(tripleSlash[1].trim()); continue; }
    if (/^\s*\/\//.test(line)) { if (!cur) doc = []; continue; }

    const enumOpen = /^enum\s+(\w+)\s*\{/.exec(line);
    if (enumOpen) {
      cur = { kind: "enum", name: enumOpen[1], doc: flushDoc(), section, subsection, values: [] };
      continue;
    }
    const modelOpen = /^model\s+(\w+)\s*\{/.exec(line);
    if (modelOpen) {
      cur = { kind: "model", name: modelOpen[1], doc: flushDoc(), section, subsection, fields: [], constraints: [] };
      continue;
    }
    if (/^\}/.test(line)) {
      if (cur?.kind === "enum") enums.push(cur);
      if (cur?.kind === "model") models.push(cur);
      cur = null; doc = [];
      continue;
    }
    if (!cur) continue;

    if (cur.kind === "enum") {
      const v = /^\s*(\w+)\s*$/.exec(line);
      if (v) cur.values.push({ name: v[1], doc: flushDoc() });
      continue;
    }

    // block-level attribute: @@unique / @@index / @@id / @@map
    const block = /^\s*@@(\w+)\((.*)\)\s*$/.exec(line);
    if (block) { cur.constraints.push({ kind: block[1], args: block[2] }); doc = []; continue; }

    const f = /^\s*(\w+)\s+([\w]+)(\[\])?(\?)?\s*(.*)$/.exec(line);
    if (!f) { doc = []; continue; }
    const [, name, baseType, list, optional, restRaw] = f;

    // split a trailing `// note` off the attribute text
    const noteIdx = restRaw.indexOf("//");
    const attrs = (noteIdx >= 0 ? restRaw.slice(0, noteIdx) : restRaw).trim();
    const note = noteIdx >= 0 ? restRaw.slice(noteIdx + 2).trim() : null;

    cur.fields.push({
      name,
      baseType,
      isList: Boolean(list),
      optional: Boolean(optional),
      doc: flushDoc(),
      note,
      isId: /@id\b/.test(attrs),
      isUnique: /@unique\b/.test(attrs),
      isUpdatedAt: /@updatedAt\b/.test(attrs),
      decimal: readDecimal(attrs),
      default: readDefault(attrs),
      relation: readRelation(attrs),
      isRelation: modelNames.has(baseType),
      isEnum: enumNames.has(baseType),
    });
  }

  return { enums, models, enumNames, modelNames };
}
