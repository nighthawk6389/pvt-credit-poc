"use client";

import {
  Bar,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = {
  label: string;
  drawdown: number;
  paydown: number;
  interest: number;
  endingBal: number;
  isProjected: boolean;
};

export function CashflowChart({ data }: { data: Point[] }) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            interval={1}
          />
          <YAxis
            yAxisId="bal"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${v}`}
          />
          <YAxis yAxisId="flow" orientation="right" hide />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(v: number, n: string) => {
              const labels: Record<string, string> = {
                endingBal: "Balance",
                drawdown: "Drawdown",
                paydown: "Paydown",
                interest: "Interest",
              };
              return [`$${v.toFixed(1)}MM`, labels[n] ?? n];
            }}
          />
          <Bar
            yAxisId="flow"
            dataKey="drawdown"
            fill="var(--chart-2)"
            radius={[2, 2, 0, 0]}
            isAnimationActive={false}
          />
          <Bar
            yAxisId="flow"
            dataKey="interest"
            fill="color-mix(in oklch, var(--chart-4) 60%, transparent)"
            radius={[2, 2, 0, 0]}
            isAnimationActive={false}
          />
          <Line
            yAxisId="bal"
            type="stepAfter"
            dataKey="endingBal"
            stroke="var(--chart-1)"
            strokeWidth={2.25}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
