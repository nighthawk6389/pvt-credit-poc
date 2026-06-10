"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function KpiCard({
  label,
  value,
  sublabel,
  delta,
  deltaTone,
  icon,
  spark,
  sparkColor = "var(--chart-1)",
}: {
  label: string;
  value: React.ReactNode;
  sublabel?: string;
  delta?: string;
  deltaTone?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
  spark?: number[];
  sparkColor?: string;
}) {
  const tone =
    deltaTone === "up"
      ? "text-[var(--success)]"
      : deltaTone === "down"
        ? "text-[var(--danger)]"
        : "text-muted-foreground";
  const DeltaIcon = deltaTone === "down" ? ArrowDownRight : ArrowUpRight;
  const gid = `spark-${label.replace(/\W/g, "")}`;

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex items-start justify-between gap-2 p-4 pb-2">
        <div className="min-w-0 space-y-1">
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium [&_svg]:size-3.5">
            {icon}
            {label}
          </div>
          <div className="text-2xl font-semibold tracking-tight tabular-nums">
            {value}
          </div>
          {(sublabel || delta) && (
            <div className="flex items-center gap-1.5 text-xs">
              {delta && (
                <span className={cn("inline-flex items-center gap-0.5 font-medium", tone)}>
                  {deltaTone !== "neutral" && <DeltaIcon className="size-3" />}
                  {delta}
                </span>
              )}
              {sublabel && <span className="text-muted-foreground">{sublabel}</span>}
            </div>
          )}
        </div>
      </div>
      {spark && spark.length > 1 && (
        <div className="h-10 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spark.map((v, i) => ({ i, v }))} margin={{ top: 2, bottom: 0, left: 0, right: 0 }}>
              <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={sparkColor} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={sparkColor}
                strokeWidth={1.75}
                fill={`url(#${gid})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
