"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";

export function HeadroomChart({
  data,
}: {
  data: { label: string; [covenant: string]: string | number | null }[];
}) {
  const keys = Object.keys(data[0] ?? {}).filter((k) => k !== "label");
  const colors = ["var(--chart-1)", "var(--chart-3)", "var(--chart-2)", "var(--chart-4)"];

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value) => [`${Number(value).toFixed(1)}% headroom`, ""]}
          />
          <ReferenceLine y={0} stroke="var(--danger)" strokeDasharray="4 4" />
          {keys.map((k, i) => (
            <Line
              key={k}
              type="monotone"
              dataKey={k}
              name={k}
              stroke={colors[i % colors.length]}
              strokeWidth={2}
              dot={{ r: 2 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        {keys.map((k, i) => (
          <span key={k} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="size-2.5 rounded-[2px]"
              style={{ background: colors[i % colors.length] }}
            />
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}
