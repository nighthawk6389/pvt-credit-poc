"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleDollarSign } from "lucide-react";

import { cn } from "@/lib/utils";
import { PRIMARY_NAV } from "@/lib/nav";

export function SidebarContent() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center gap-2.5 px-5">
        <div className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md shadow-sm">
          <CircleDollarSign className="size-4" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">Lumen</div>
          <div className="text-sidebar-foreground/55 text-[10px] tracking-wide uppercase">
            Private Credit
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-3">
        {PRIMARY_NAV.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              <item.icon
                className={cn(
                  "size-4 shrink-0",
                  active ? "text-primary" : "text-sidebar-foreground/55",
                )}
              />
              {item.title}
            </Link>
          );
        })}
      </nav>

      <div className="border-sidebar-border/60 mx-3 mb-3 rounded-lg border bg-sidebar-accent/40 p-3 text-[11px] leading-relaxed text-sidebar-foreground/60">
        <span className="font-medium text-sidebar-foreground/80">Demo POC.</span>{" "}
        Simulated data & Bloomberg analytics. Not investment advice.
      </div>
    </div>
  );
}
