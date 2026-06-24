"use client";

import * as React from "react";
import { Check, Plus, Sparkles, Trash2, X, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { useRole } from "@/lib/auth/context";
import { can } from "@/lib/auth/roles";
import { FIELD_LIBRARY, RATIO_TEMPLATES, validateFormula } from "@/lib/covenants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  upsertCovenantDefinition,
  deleteCovenantDefinition,
  runCovenantExtraction,
} from "@/server/actions/covenant-ops";

type DefSummary = {
  id: string;
  name: string;
  category: string;
  formula: string;
  operator: string;
  unit: string;
  threshold: number;
  source: string | null;
};

export function FormulaBuilder({
  dealId,
  definitions,
}: {
  dealId: string;
  definitions: DefSummary[];
}) {
  const { role } = useRole();
  const canEdit = can(role, "edit", "covenant");
  const [adding, setAdding] = React.useState(false);
  const [pending, start] = React.useTransition();
  const [drafts, setDrafts] = React.useState<Record<string, unknown>[] | null>(null);
  const [extracting, setExtracting] = React.useState(false);

  function extract() {
    setExtracting(true);
    start(async () => {
      try {
        const res = (await runCovenantExtraction(dealId, "extract_covenant_terms")) as Record<string, unknown>[] | null;
        setDrafts(res ?? []);
        toast.success("Extracted covenant terms — review & add");
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setExtracting(false);
      }
    });
  }

  function applyDraft(d: Record<string, unknown>) {
    start(async () => {
      try {
        await upsertCovenantDefinition(dealId, {
          name: String(d.name),
          category: String(d.category ?? "Maintenance"),
          formula: String(d.formula),
          operator: String(d.operator ?? "<="),
          unit: String(d.unit ?? "x"),
          threshold: Number(d.threshold ?? 0),
          thresholdSchedule: (d.thresholdSchedule as never) ?? null,
          springingCondition: (d.springingCondition as never) ?? null,
          source: (d.source as string) ?? null,
        });
        toast.success(`Added "${String(d.name)}"`);
        setDrafts((prev) => prev?.filter((x) => x !== d) ?? null);
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  function remove(id: string, name: string) {
    if (!confirm(`Remove "${name}"?`)) return;
    start(async () => {
      try {
        await deleteCovenantDefinition(dealId, id);
        toast.success("Removed");
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Covenant Definitions</h2>
          <p className="text-muted-foreground text-sm">
            Formula-defined over the fundamental field library. Edits re-run reconciliation.
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={pending} onClick={extract}>
              {extracting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Extract from agreement
            </Button>
            <Button size="sm" onClick={() => setAdding((v) => !v)}>
              <Plus className="size-4" /> Add covenant
            </Button>
          </div>
        )}
      </div>

      {/* AI draft review */}
      {drafts && drafts.length > 0 && (
        <div className="space-y-2 rounded-xl border border-[color-mix(in_oklch,var(--primary)_30%,transparent)] bg-primary/5 p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="size-4 text-primary" /> Extracted drafts — review before adding
          </div>
          {drafts.map((d, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-border/60 bg-card p-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{String(d.name)}</div>
                <div className="text-muted-foreground font-mono text-[11px]">
                  {String(d.formula)} {String(d.operator)} {String(d.threshold)}
                  {String(d.unit)}
                </div>
              </div>
              <Button size="sm" disabled={pending} onClick={() => applyDraft(d)}>
                <Check className="size-3.5" /> Add
              </Button>
            </div>
          ))}
        </div>
      )}

      {adding && canEdit && (
        <DefinitionForm
          dealId={dealId}
          onDone={() => setAdding(false)}
          pending={pending}
          start={start}
        />
      )}

      {/* Existing definitions */}
      <div className="overflow-hidden rounded-xl border border-border/70 bg-card divide-y divide-border/50">
        {definitions.map((d) => (
          <div key={d.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{d.name}</span>
                <Badge variant="muted" className="text-[9px]">{d.category}</Badge>
              </div>
              <div className="text-muted-foreground font-mono text-[11px]">
                {d.formula} {d.operator} {d.threshold}{d.unit === "x" ? "x" : d.unit}
                {d.source && <span className="ml-2 not-italic opacity-70">· {d.source}</span>}
              </div>
            </div>
            {canEdit && (
              <Button variant="ghost" size="icon-sm" onClick={() => remove(d.id, d.name)}>
                <Trash2 className="size-4 text-muted-foreground" />
              </Button>
            )}
          </div>
        ))}
        {definitions.length === 0 && (
          <div className="text-muted-foreground px-4 py-6 text-center text-sm">No covenants defined.</div>
        )}
      </div>
    </div>
  );
}

function DefinitionForm({
  dealId,
  onDone,
  pending,
  start,
}: {
  dealId: string;
  onDone: () => void;
  pending: boolean;
  start: React.TransitionStartFunction;
}) {
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState("Maintenance");
  const [formula, setFormula] = React.useState("");
  const [operator, setOperator] = React.useState("<=");
  const [unit, setUnit] = React.useState("x");
  const [threshold, setThreshold] = React.useState("");

  const check = formula.trim() ? validateFormula(formula) : null;

  function insertField(code: string) {
    setFormula((f) => (f ? `${f} ${code}` : code));
  }

  function applyTemplate(t: (typeof RATIO_TEMPLATES)[number]) {
    setName(t.name);
    setCategory(t.category);
    setFormula(t.formula);
    setOperator(t.operator);
    setUnit(t.unit);
    setThreshold(String(t.threshold));
  }

  function save() {
    if (!check?.ok) return toast.error("Fix the formula first");
    start(async () => {
      try {
        await upsertCovenantDefinition(dealId, {
          name, category, formula, operator, unit, threshold: parseFloat(threshold) || 0,
        });
        toast.success(`Added "${name}"`);
        onDone();
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  return (
    <div className="space-y-4 rounded-xl border border-border/70 bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">New covenant</span>
        <Button variant="ghost" size="icon-sm" onClick={onDone}><X className="size-4" /></Button>
      </div>

      <div>
        <Label className="text-xs">Start from a template</Label>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {RATIO_TEMPLATES.map((t) => (
            <button key={t.name} onClick={() => applyTemplate(t)}
              className="rounded-full border border-border/70 px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs">Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Total Net Leverage" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Maintenance", "Springing", "Incurrence"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Unit</Label>
          <Select value={unit} onValueChange={setUnit}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["x", "$MM", "%"].map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Formula</Label>
        <Input value={formula} onChange={(e) => setFormula(e.target.value)} placeholder="(TOT_DEBT - CASH) / EBITDA_ADJ" className="font-mono" />
        <div className="flex items-center gap-1.5 text-xs">
          {check && (check.ok ? (
            <span className="text-[var(--success)] inline-flex items-center gap-1"><Check className="size-3" /> valid · uses {check.fields.join(", ")}</span>
          ) : (
            <span className="text-[var(--danger)] inline-flex items-center gap-1"><AlertCircle className="size-3" /> {check.error}</span>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {Object.values(FIELD_LIBRARY).filter((f) => f.category !== "Derived" || f.code === "NET_DEBT").slice(0, 12).map((f) => (
            <button key={f.code} onClick={() => insertField(f.code)} title={f.label}
              className="rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground">
              {f.code}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-end gap-3">
        <div className="w-24 space-y-1.5">
          <Label className="text-xs">Operator</Label>
          <Select value={operator} onValueChange={setOperator}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="<=">&le; (max)</SelectItem>
              <SelectItem value=">=">&ge; (min)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-28 space-y-1.5">
          <Label className="text-xs">Threshold</Label>
          <Input type="number" step="0.05" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
        </div>
        <Button className="ml-auto" disabled={pending || !check?.ok || !name} onClick={save}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Save & reconcile
        </Button>
      </div>
    </div>
  );
}
