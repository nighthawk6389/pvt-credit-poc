"use client";

import * as React from "react";
import { Sparkles, Save, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

import { useRole } from "@/lib/auth/context";
import { can } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateMemoSection } from "@/server/actions/memo";

type Section = { key: string; title: string; body: string };

export function MemoEditor({
  dealId,
  borrower,
  initialSections,
}: {
  dealId: string;
  borrower: string;
  initialSections: Section[];
}) {
  const { role } = useRole();
  const editable = can(role, "edit", "memo");
  const [sections, setSections] = React.useState(initialSections);
  const [active, setActive] = React.useState(initialSections[0]?.key);
  const [saving, setSaving] = React.useState<string | null>(null);
  const [drafting, setDrafting] = React.useState<string | null>(null);
  const [savedKey, setSavedKey] = React.useState<string | null>(null);

  const current = sections.find((s) => s.key === active);

  function setBody(key: string, body: string) {
    setSections((s) => s.map((sec) => (sec.key === key ? { ...sec, body } : sec)));
  }

  async function save(section: Section) {
    setSaving(section.key);
    try {
      await updateMemoSection(dealId, section.key, section.body);
      setSavedKey(section.key);
      setTimeout(() => setSavedKey(null), 1800);
      toast.success(`Saved "${section.title}"`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(null);
    }
  }

  async function draft(section: Section) {
    setDrafting(section.key);
    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "draft_ic_memo",
          dealId,
          context: { section: section.title, borrower },
        }),
      });
      const data = await res.json();
      setBody(section.key, data.text);
      toast.success(`Drafted "${section.title}" — review & save`);
    } catch {
      toast.error("Draft failed");
    } finally {
      setDrafting(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[200px_1fr]">
      {/* Section nav */}
      <div className="flex flex-row gap-1 overflow-x-auto sm:flex-col">
        {sections.map((s, i) => (
          <button
            key={s.key}
            onClick={() => setActive(s.key)}
            className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
              active === s.key
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-muted/60"
            }`}
          >
            <span className="text-muted-foreground/60 text-xs tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="whitespace-nowrap">{s.title}</span>
          </button>
        ))}
      </div>

      {/* Editor */}
      {current && (
        <div className="bg-card rounded-xl border border-border/70 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="font-semibold">{current.title}</h3>
            {editable && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => draft(current)}
                  disabled={drafting === current.key}
                >
                  {drafting === current.key ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  Draft with AI
                </Button>
                <Button
                  size="sm"
                  onClick={() => save(current)}
                  disabled={saving === current.key}
                >
                  {savedKey === current.key ? (
                    <Check className="size-4" />
                  ) : saving === current.key ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Save
                </Button>
              </div>
            )}
          </div>
          {editable ? (
            <Textarea
              value={current.body}
              onChange={(e) => setBody(current.key, e.target.value)}
              className="min-h-64 text-sm leading-relaxed"
            />
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {current.body}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
