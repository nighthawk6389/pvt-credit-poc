"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { DEAL_TABS } from "@/lib/nav";

export function DealTabs({ dealId }: { dealId: string }) {
  const pathname = usePathname();
  const base = `/deals/${dealId}`;

  return (
    <div className="border-border/70 -mx-4 mb-6 overflow-x-auto border-b px-4 lg:-mx-8 lg:px-8">
      <nav className="flex min-w-max gap-1">
        {DEAL_TABS.map((tab) => {
          const href = tab.segment ? `${base}/${tab.segment}` : base;
          const active =
            tab.segment === ""
              ? pathname === base
              : pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={tab.title}
              href={href}
              className={cn(
                "relative whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.title}
              {active && (
                <span className="bg-primary absolute inset-x-2 -bottom-px h-0.5 rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
