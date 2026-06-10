"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    color?: string;
  };
};

type ChartContextProps = { config: ChartConfig };

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >["children"];
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none [&_.recharts-tooltip-cursor]:stroke-border [&_.recharts-reference-line_line]:stroke-border",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorConfig = Object.entries(config).filter(
    ([, c]) => c.color,
  );
  if (!colorConfig.length) return null;

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `[data-chart=${id}] {\n${colorConfig
          .map(([key, item]) => (item.color ? `  --color-${key}: ${item.color};` : null))
          .filter(Boolean)
          .join("\n")}\n}`,
      }}
    />
  );
}

const ChartTooltip = RechartsPrimitive.Tooltip;

function ChartTooltipContent({
  active,
  payload,
  label,
  labelFormatter,
  formatter,
  hideLabel = false,
  hideIndicator = false,
  className,
}: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
  label?: React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  labelFormatter?: (value: any) => React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formatter?: (value: any, name: string) => React.ReactNode;
  hideLabel?: boolean;
  hideIndicator?: boolean;
  className?: string;
}) {
  const { config } = useChart();
  if (!active || !payload?.length) return null;

  return (
    <div
      className={cn(
        "border-border/60 bg-popover grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-md",
        className,
      )}
    >
      {!hideLabel && (
        <div className="text-foreground font-medium">
          {labelFormatter ? labelFormatter(label) : label}
        </div>
      )}
      <div className="grid gap-1.5">
        {payload.map((item, i) => {
          const key = item.dataKey || item.name;
          const itemConfig = config[key as string];
          const color = item.color || item.payload?.fill;
          return (
            <div
              key={i}
              className="flex w-full items-center gap-2 [&>svg]:size-2.5"
            >
              {!hideIndicator && (
                <span
                  className="size-2.5 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: color }}
                />
              )}
              <div className="flex flex-1 items-center justify-between gap-3 leading-none">
                <span className="text-muted-foreground">
                  {itemConfig?.label || item.name}
                </span>
                <span className="text-foreground font-mono font-medium tabular-nums">
                  {formatter
                    ? formatter(item.value, item.name)
                    : typeof item.value === "number"
                      ? item.value.toLocaleString()
                      : item.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ChartLegend = RechartsPrimitive.Legend;

function ChartLegendContent({
  payload,
  className,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
  className?: string;
}) {
  const { config } = useChart();
  if (!payload?.length) return null;
  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-4 pt-3", className)}>
      {payload.map((item, i) => {
        const key = item.dataKey || item.value;
        const itemConfig = config[key as string];
        return (
          <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="size-2.5 shrink-0 rounded-[2px]"
              style={{ backgroundColor: item.color }}
            />
            {itemConfig?.label || item.value}
          </div>
        );
      })}
    </div>
  );
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
};
