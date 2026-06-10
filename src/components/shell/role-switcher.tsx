"use client";

import { CheckIcon, ChevronsUpDownIcon, ShieldCheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { ROLES, ROLE_META, type Role } from "@/lib/auth/roles";
import { useRole } from "@/lib/auth/context";
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

const toneClass: Record<string, string> = {
  info: "bg-[color-mix(in_oklch,var(--info)_20%,transparent)] text-[var(--info)]",
  primary: "bg-primary/15 text-primary",
  success: "bg-[color-mix(in_oklch,var(--success)_20%,transparent)] text-[var(--success)]",
  warning: "bg-[color-mix(in_oklch,var(--warning)_20%,transparent)] text-[var(--warning)]",
  muted: "bg-muted text-muted-foreground",
};

export function RoleSwitcher() {
  const { role, setRole } = useRole();
  const meta = ROLE_META[role];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-10 gap-2 pr-2 pl-2.5 has-[>svg]:px-2.5"
        >
          <Avatar className="size-6">
            <AvatarFallback className={cn("text-[10px] font-semibold", toneClass[meta.tone])}>
              {meta.initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden text-left leading-tight sm:block">
            <div className="text-xs font-medium">{meta.person}</div>
            <div className="text-muted-foreground text-[10px]">{role}</div>
          </div>
          <ChevronsUpDownIcon className="text-muted-foreground size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
          <ShieldCheckIcon className="size-3.5" />
          Acting as — switch to see access change
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ROLES.map((r: Role) => {
          const m = ROLE_META[r];
          const active = r === role;
          return (
            <DropdownMenuItem
              key={r}
              onClick={() => setRole(r)}
              className="gap-2.5 py-2"
            >
              <Avatar className="size-7">
                <AvatarFallback className={cn("text-[10px] font-semibold", toneClass[m.tone])}>
                  {m.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 leading-tight">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {r}
                  {r === "Read-only" && (
                    <Badge variant="muted" className="text-[9px]">
                      privileged deals hidden
                    </Badge>
                  )}
                </div>
                <div className="text-muted-foreground text-xs">{m.blurb}</div>
              </div>
              {active && <CheckIcon className="size-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
