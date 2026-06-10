"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { useRole } from "@/lib/auth/context";
import { can } from "@/lib/auth/roles";
import { statusVariant } from "@/lib/status";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateDdqStatus } from "@/server/actions/diligence";

type Item = {
  id: string;
  category: string;
  question: string;
  status: string;
  answer: string | null;
  assignee: string | null;
};

const STATUSES = ["Open", "In Review", "Cleared", "Flag"];

export function DdqList({ dealId, items }: { dealId: string; items: Item[] }) {
  const { role } = useRole();
  const editable = can(role, "edit", "deal");
  const [pending, start] = React.useTransition();

  const byCategory = items.reduce<Record<string, Item[]>>((acc, it) => {
    (acc[it.category] ??= []).push(it);
    return acc;
  }, {});

  function change(item: Item, status: string) {
    start(async () => {
      try {
        await updateDdqStatus(dealId, item.id, status);
        toast.success(`Marked "${status}"`);
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  return (
    <div className="space-y-5">
      {Object.entries(byCategory).map(([cat, list]) => (
        <div key={cat}>
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-sm font-semibold">{cat}</h3>
            <Badge variant="muted" className="text-[10px]">
              {list.filter((i) => i.status === "Cleared").length}/{list.length} cleared
            </Badge>
          </div>
          <div className="bg-card divide-y divide-border/50 overflow-hidden rounded-xl border border-border/70">
            {list.map((item) => (
              <div key={item.id} className="flex items-start gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <div className="text-sm leading-snug">{item.question}</div>
                  {item.answer && (
                    <div className="text-muted-foreground mt-1 text-xs leading-relaxed">
                      {item.answer}
                    </div>
                  )}
                  {item.assignee && (
                    <div className="text-muted-foreground/70 mt-1 text-[11px]">
                      {item.assignee}
                    </div>
                  )}
                </div>
                {editable ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      disabled={pending}
                      className="shrink-0 outline-none"
                    >
                      <Badge
                        variant={statusVariant(item.status)}
                        className="cursor-pointer gap-1"
                      >
                        {item.status}
                        <ChevronDown className="size-3" />
                      </Badge>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {STATUSES.map((s) => (
                        <DropdownMenuItem key={s} onClick={() => change(item, s)}>
                          <Badge variant={statusVariant(s)} className="text-[10px]">
                            {s}
                          </Badge>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
