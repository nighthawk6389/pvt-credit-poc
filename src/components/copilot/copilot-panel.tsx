"use client";

import * as React from "react";
import { Sparkles, SendHorizonal, FileText, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CopilotResponse, CopilotTask } from "@/lib/copilot/types";

type Message = {
  role: "user" | "assistant";
  text: string;
  citations?: CopilotResponse["citations"];
};

export function CopilotPanel({
  dealId,
  documentIds,
  documentName,
  suggestions,
  className,
  compact = false,
}: {
  dealId: string;
  documentIds?: string[];
  documentName?: string;
  suggestions?: string[];
  className?: string;
  compact?: boolean;
}) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const defaultSuggestions = suggestions ?? [
    "What are the key risks?",
    "Summarize the covenant package",
    "What is the proposed leverage?",
  ];

  async function ask(prompt: string, task: CopilotTask = "doc_qa") {
    if (!prompt.trim() || loading) return;
    setMessages((m) => [...m, { role: "user", text: prompt }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, dealId, prompt, documentIds }),
      });
      const data: CopilotResponse = await res.json();
      setMessages((m) => [
        ...m,
        { role: "assistant", text: data.text, citations: data.citations },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() =>
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }),
      );
    }
  }

  return (
    <div
      className={cn(
        "bg-card flex h-full flex-col rounded-xl border border-border/70",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
        <div className="bg-primary/15 text-primary flex size-7 items-center justify-center rounded-md">
          <Sparkles className="size-4" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Deal Copilot</div>
          <div className="text-muted-foreground text-[11px]">
            {documentName ? `Grounded in ${documentName}` : "Grounded in the data room"}
          </div>
        </div>
        <Badge variant="muted" className="ml-auto text-[9px]">
          AI · mocked
        </Badge>
      </div>

      <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto">
        <div className="flex flex-col gap-3 p-4">
          {messages.length === 0 && (
            <div className="text-muted-foreground space-y-3 py-2 text-sm">
              <p>
                Ask questions grounded in the documents, or draft sections of the
                IC memo. Answers include citations back to source files.
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[92%] rounded-lg px-3 py-2 text-sm leading-relaxed",
                m.role === "user"
                  ? "bg-primary text-primary-foreground self-end"
                  : "bg-muted/60 self-start",
              )}
            >
              <p className="whitespace-pre-wrap">{m.text}</p>
              {m.citations && m.citations.length > 0 && (
                <div className="mt-2 space-y-1.5 border-t border-border/40 pt-2">
                  {m.citations.map((c, j) => (
                    <div key={j} className="flex items-start gap-1.5 text-xs">
                      <FileText className="text-muted-foreground mt-0.5 size-3 shrink-0" />
                      <div>
                        <span className="font-medium">{c.documentName}</span>
                        <p className="text-muted-foreground italic">
                          “{c.snippet}…”
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="bg-muted/60 text-muted-foreground flex items-center gap-2 self-start rounded-lg px-3 py-2 text-sm">
              <Loader2 className="size-3.5 animate-spin" />
              Analyzing documents…
            </div>
          )}
        </div>
      </div>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {defaultSuggestions.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              className="border-border/70 hover:bg-muted text-muted-foreground hover:text-foreground rounded-full border px-2.5 py-1 text-xs transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="flex items-center gap-2 border-t border-border/70 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the copilot…"
          className="placeholder:text-muted-foreground flex-1 bg-transparent text-sm outline-none"
        />
        <Button type="submit" size="icon-sm" disabled={loading || !input.trim()}>
          <SendHorizonal className="size-4" />
        </Button>
      </form>
      {compact && null}
    </div>
  );
}
