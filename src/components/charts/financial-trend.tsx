"use client";

import {
  Bar,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";

type Point = {
  label: string;
  ebitda: number;
  revenue: number;
  leverage: number;
  isActual: boolean;
};

export function FinancialTrend({ data }: { data: Point[] }) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            domain={[0, "dataMax + 1"]}
            width={28}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(v: number, n: string) =>
              n === "leverage" ? [`${v.toFixed(1)}x`, "Net Leverage"] : [`$${v}MM`, n === "ebitda" ? "EBITDA" : "Revenue"]
            }
          />
          <Bar
            yAxisId="left"
            dataKey="revenue"
            fill="color-mix(in oklch, var(--chart-2) 35%, transparent)"
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
          />
          <Bar
            yAxisId="left"
            dataKey="ebitda"
            fill="var(--chart-1)"
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="leverage"
            stroke="var(--chart-4)"
            strokeWidth={2}
            dot={{ r: 2.5, fill: "var(--chart-4)" }}
            isAnimationActive={false}
          />
          <ReferenceLine
            yAxisId="left"
            x={data.findLast((d) => d.isActual)?.label}
            stroke="var(--border)"
            strokeDasharray="3 3"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
