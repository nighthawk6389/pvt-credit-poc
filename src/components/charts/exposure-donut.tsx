"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "color-mix(in oklch, var(--chart-1) 60%, var(--muted))",
  "color-mix(in oklch, var(--chart-2) 60%, var(--muted))",
  "color-mix(in oklch, var(--chart-3) 60%, var(--muted))",
];

export function ExposureDonut({
  data,
  nameKey = "sector",
}: {
  data: { pct: number; [k: string]: string | number }[];
  nameKey?: string;
}) {
  if (!data.length)
    return (
      <div className="text-muted-foreground flex h-[200px] items-center justify-center text-sm">
        No exposure data
      </div>
    );

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="h-[180px] w-[180px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="pct"
              nameKey={nameKey}
              innerRadius={52}
              outerRadius={84}
              paddingAngle={2}
              stroke="var(--card)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: number, n: string) => [`${v}%`, n]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid flex-1 grid-cols-1 gap-x-4 gap-y-1.5 text-sm">
        {data.slice(0, 8).map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-[3px]"
              style={{ background: COLORS[i % COLORS.length] }}
            />
            <span className="flex-1 truncate text-muted-foreground">
              {d[nameKey]}
            </span>
            <span className="font-medium tabular-nums">{d.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
