"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const SUB_TABS = [
  { title: "Overview", segment: "" },
  { title: "Definitions", segment: "definitions" },
  { title: "Fundamentals & Add-backs", segment: "fundamentals" },
  { title: "Reconciliation", segment: "reconciliation" },
  { title: "Forecast", segment: "forecast" },
  { title: "Compliance Pack", segment: "pack" },
];

export function CovenantSubnav({ dealId }: { dealId: string }) {
  const pathname = usePathname();
  const base = `/deals/${dealId}/covenants`;

  return (
    <div className="mb-5 flex flex-wrap gap-1 rounded-lg border border-border/60 bg-muted/30 p-1">
      {SUB_TABS.map((t) => {
        const href = t.segment ? `${base}/${t.segment}` : base;
        const active = t.segment === "" ? pathname === base : pathname === href;
        return (
          <Link
            key={t.title}
            href={href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.title}
          </Link>
        );
      })}
    </div>
  );
}
