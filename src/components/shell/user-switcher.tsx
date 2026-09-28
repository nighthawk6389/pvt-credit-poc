"use client";

import * as React from "react";
import { CheckIcon, ChevronsUpDownIcon, Loader2, ShieldCheckIcon } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import type { Role } from "@/lib/auth/roles";
import { useSession } from "@/lib/auth/context";
import { switchUser } from "@/server/actions/session";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface SwitchableUser {
  id: string;
  name: string;
  title: string | null;
  initials: string | null;
  role: Role;
}

const roleTone: Record<string, string> = {
  "Deal Lead": "bg-[color-mix(in_oklch,var(--info)_20%,transparent)] text-[var(--info)]",
  Analyst: "bg-primary/15 text-primary",
  "IC Member": "bg-[color-mix(in_oklch,var(--success)_20%,transparent)] text-[var(--success)]",
  Compliance: "bg-[color-mix(in_oklch,var(--warning)_20%,transparent)] text-[var(--warning)]",
  "Read-only": "bg-muted text-muted-foreground",
};

/**
 * Act as a different user. Identity is a real database row now, so switching
 * changes attribution and permissions, not just a label.
 */
export function UserSwitcher({ users }: { users: SwitchableUser[] }) {
  const session = useSession();
  const [pending, start] = React.useTransition();

  const initialsOf = (u: { name: string; initials: string | null }) =>
    u.initials ?? u.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  function pick(u: SwitchableUser) {
    if (u.id === session?.userId) return;
    start(async () => {
      try {
        await switchUser(u.id);
        toast.success(`Now acting as ${u.name} (${u.role})`);
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  const current = session
    ? { name: session.name, initials: session.initials, role: session.role }
    : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-10 gap-2 pr-2 pl-2.5 has-[>svg]:px-2.5">
          <Avatar className="size-6">
            <AvatarFallback
              className={cn("text-[10px] font-semibold", roleTone[current?.role ?? ""] ?? "bg-muted")}
            >
              {current ? initialsOf({ name: current.name, initials: current.initials }) : "–"}
            </AvatarFallback>
          </Avatar>
          <div className="hidden text-left leading-tight sm:block">
            <div className="text-xs font-medium">{current?.name ?? "No session"}</div>
            <div className="text-muted-foreground text-[10px]">{current?.role}</div>
          </div>
          {pending ? (
            <Loader2 className="text-muted-foreground size-3.5 animate-spin" />
          ) : (
            <ChevronsUpDownIcon className="text-muted-foreground size-3.5" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="text-muted-foreground flex items-center gap-2 text-xs font-normal">
          <ShieldCheckIcon className="size-3.5" />
          Acting as — permissions follow org membership
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {users.map((u) => {
          const active = u.id === session?.userId;
          return (
            <DropdownMenuItem key={u.id} onClick={() => pick(u)} className="gap-2.5 py-2">
              <Avatar className="size-7">
                <AvatarFallback className={cn("text-[10px] font-semibold", roleTone[u.role] ?? "bg-muted")}>
                  {initialsOf(u)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 leading-tight">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {u.name}
                  {u.role === "Read-only" && (
                    <Badge variant="muted" className="text-[9px]">privileged deals hidden</Badge>
                  )}
                </div>
                <div className="text-muted-foreground text-xs">
                  {u.title ? `${u.title} · ` : ""}{u.role}
                </div>
              </div>
              {active && <CheckIcon className="text-primary size-4" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
