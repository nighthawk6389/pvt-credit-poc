"use client";

import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = {
  name: string;
  irrPct: number | null;
  moic: number | null;
  watchlist: boolean;
};

export function ReturnsChart({ data }: { data: Point[] }) {
  const rows = data.filter((d) => d.irrPct != null);
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 4, right: 24, bottom: 0, left: 8 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={170}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: "color-mix(in oklch, var(--muted) 50%, transparent)" }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value, _name, item) => {
              const p = item?.payload as Point | undefined;
              return [
                `${Number(value).toFixed(1)}% IRR · ${p?.moic?.toFixed(2) ?? "—"}x MOIC`,
                p?.name ?? "",
              ];
            }}
          />
          <ReferenceLine x={0} stroke="var(--border)" />
          <Bar dataKey="irrPct" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {rows.map((r, i) => (
              <Cell
                key={i}
                fill={
                  (r.irrPct ?? 0) < 0
                    ? "var(--chart-5)"
                    : r.watchlist
                      ? "var(--chart-4)"
                      : "var(--chart-1)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
