"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

import { cn, fmtMM, fmtSpread, fmtX, fmtPct } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { RiskRatingBadge, WatchlistBadge } from "@/components/deal/badges";

export type Position = {
  id: string;
  borrowerId: string;
  borrower: string;
  sector: string;
  sponsor: string | null;
  size: number;
  spread: number | null;
  leverage: number | null;
  coverage: number | null;
  rating: string | null;
  trend: string | null;
  watchlist: boolean;
  mark: number | null;
  breaches: number;
};

type SortKey = "borrower" | "size" | "spread" | "leverage" | "mark" | "rating";

function SortHead({
  label,
  k,
  align = "left",
  sort,
  dir,
  onToggle,
}: {
  label: string;
  k: SortKey;
  align?: "left" | "right";
  sort: SortKey;
  dir: "asc" | "desc";
  onToggle: (k: SortKey) => void;
}) {
  return (
    <TableHead className={align === "right" ? "text-right" : ""}>
      <button
        onClick={() => onToggle(k)}
        className={cn(
          "hover:text-foreground inline-flex items-center gap-1 transition-colors",
          align === "right" && "flex-row-reverse",
        )}
      >
        {label}
        {sort === k ? (
          dir === "asc" ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          )
        ) : (
          <ArrowUpDown className="size-3 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}

export function PortfolioTable({ positions }: { positions: Position[] }) {
  const [sort, setSort] = React.useState<SortKey>("size");
  const [dir, setDir] = React.useState<"asc" | "desc">("desc");
  const [filter, setFilter] = React.useState("");

  const filtered = positions.filter(
    (p) =>
      p.borrower.toLowerCase().includes(filter.toLowerCase()) ||
      p.sector.toLowerCase().includes(filter.toLowerCase()) ||
      (p.sponsor ?? "").toLowerCase().includes(filter.toLowerCase()),
  );

  const sorted = [...filtered].sort((a, b) => {
    let av: number | string = 0;
    let bv: number | string = 0;
    switch (sort) {
      case "borrower":
        av = a.borrower;
        bv = b.borrower;
        break;
      case "rating":
        av = Number(a.rating) || 0;
        bv = Number(b.rating) || 0;
        break;
      default:
        av = (a[sort] as number) ?? 0;
        bv = (b[sort] as number) ?? 0;
    }
    const cmp = typeof av === "string" ? av.localeCompare(bv as string) : av - (bv as number);
    return dir === "asc" ? cmp : -cmp;
  });

  function toggle(key: SortKey) {
    if (sort === key) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSort(key);
      setDir(key === "borrower" ? "asc" : "desc");
    }
  }

  const headProps = { sort, dir, onToggle: toggle };

  return (
    <div className="bg-card overflow-hidden rounded-xl border border-border/70">
      <div className="border-b border-border/60 p-3">
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by borrower, sector, or sponsor…"
          className="max-w-sm"
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <SortHead label="Borrower" k="borrower" {...headProps} />
            <TableHead>Sector</TableHead>
            <SortHead label="Commitment" k="size" align="right" {...headProps} />
            <SortHead label="Spread" k="spread" align="right" {...headProps} />
            <SortHead label="Leverage" k="leverage" align="right" {...headProps} />
            <SortHead label="Mark" k="mark" align="right" {...headProps} />
            <SortHead label="Rating" k="rating" align="right" {...headProps} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                <Link
                  href={`/portfolio/${p.borrowerId}`}
                  className="hover:text-primary font-medium transition-colors"
                >
                  {p.borrower}
                </Link>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="text-muted-foreground text-xs">{p.sponsor}</span>
                  {p.watchlist && <WatchlistBadge />}
                  {p.breaches > 0 && (
                    <span className="text-[var(--danger)] text-[10px] font-medium">
                      {p.breaches} breach
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{p.sector}</TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {fmtMM(p.size, 0)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {fmtSpread(p.spread)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {fmtX(p.leverage)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {p.mark != null ? fmtPct(p.mark) : "—"}
              </TableCell>
              <TableCell className="text-right">
                <RiskRatingBadge rating={p.rating} trend={p.trend} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
