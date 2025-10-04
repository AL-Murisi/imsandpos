"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

// Chart configuration types
export interface ChartConfig {
  [k: string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    color?: string;
    theme?: Record<string, string>;
  };
}

export interface ChartContextValue {
  config: ChartConfig;
}

const ChartContext = React.createContext<ChartContextValue | null>(null);

export function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }

  return context;
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ComponentProps<
      typeof RechartsPrimitive.ResponsiveContainer
    >["children"];
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border flex aspect-video justify-center text-xs [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-sector]:outline-none [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-none",
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
});
ChartContainer.displayName = "Chart";

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([_, config]) => config.theme || config.color,
  );

  if (!colorConfig.length) {
    return null;
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(config)
          .filter(([_, config]) => config.theme || config.color)
          .map(([key, itemConfig]) => {
            const color =
              itemConfig.theme?.light ||
              itemConfig.color ||
              "hsl(var(--primary))";
            const darkColor = itemConfig.theme?.dark || color;

            return `
              [data-chart="${id}"] .recharts-layer .recharts-active-dot[data-key="${key}"] {
                fill: ${color};
                stroke: ${color};
              }
              [data-chart="${id}"] .recharts-layer .recharts-area[data-key="${key}"] {
                fill: ${color};
              }
              [data-chart="${id}"] .recharts-layer .recharts-bar[data-key="${key}"] {
                fill: ${color};
              }
              [data-chart="${id}"] .recharts-layer .recharts-line[data-key="${key}"] {
                stroke: ${color};
              }
              [data-chart="${id}"] .recharts-layer .recharts-pie-sector[data-key="${key}"] {
                fill: ${color};
              }
              [data-chart="${id}"] .recharts-layer .recharts-radar[data-key="${key}"] {
                fill: ${color};
                stroke: ${color};
              }
              [data-chart="${id}"] .recharts-layer .recharts-radial-bar[data-key="${key}"] {
                fill: ${color};
              }
              .dark [data-chart="${id}"] .recharts-layer .recharts-active-dot[data-key="${key}"] {
                fill: ${darkColor};
                stroke: ${darkColor};
              }
              .dark [data-chart="${id}"] .recharts-layer .recharts-area[data-key="${key}"] {
                fill: ${darkColor};
              }
              .dark [data-chart="${id}"] .recharts-layer .recharts-bar[data-key="${key}"] {
                fill: ${darkColor};
              }
              .dark [data-chart="${id}"] .recharts-layer .recharts-line[data-key="${key}"] {
                stroke: ${darkColor};
              }
              .dark [data-chart="${id}"] .recharts-layer .recharts-pie-sector[data-key="${key}"] {
                fill: ${darkColor};
              }
              .dark [data-chart="${id}"] .recharts-layer .recharts-radar[data-key="${key}"] {
                fill: ${darkColor};
                stroke: ${darkColor};
              }
              .dark [data-chart="${id}"] .recharts-layer .recharts-radial-bar[data-key="${key}"] {
                fill: ${darkColor};
              }
            `;
          })
          .join("\n"),
      }}
    />
  );
};

// Tooltip interfaces with proper typing
interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    name: string;
    value: any;
    color?: string;
    payload?: Record<string, any>;
  }>;
  label?: string;
  hideLabel?: boolean;
  hideIndicator?: boolean;
  indicator?: "line" | "dot" | "dashed";
  nameKey?: string;
  labelkey?: string;
  labelFormatter?: (value: any, payload?: Array<any>) => string;
  formatter?: (
    value: any,
    name?: string,
    entry?: any,
    index?: number,
  ) => [React.ReactNode, string?];

  // Add missing props from ChartTooltipContent destructuring
  cursor?: any;
  defaultIndex?: number;
  allowEscapeViewBox?: boolean;
  animationDuration?: number;
  animationEasing?: string;
  axisId?: string | number;
  contentStyle?: React.CSSProperties;
  filterNull?: boolean;
  isAnimationActive?: boolean;
  itemSorter?: (itemA: any, itemB: any) => number;
  itemStyle?: React.CSSProperties;
  labelStyle?: React.CSSProperties;
  reverseDirection?: boolean;
  useTranslate3d?: boolean;
  wrapperStyle?: React.CSSProperties;
  accessibilityLayer?: boolean;
  coordinate?: { x: number; y: number };
  viewBox?: { x: number; y: number; width: number; height: number };
  offset?: number;
  chartType?: string;
  activePayload?: any[];
  activeLabel?: string | number;
}

const ChartTooltip = RechartsPrimitive.Tooltip;

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & ChartTooltipProps
>(
  (
    {
      active,
      payload = [],
      label,
      hideLabel = false,
      hideIndicator = false,
      indicator = "dot",
      className,
      nameKey,
      labelkey,
      labelFormatter,
      formatter,
      // Recharts props that should NOT be passed to DOM
      cursor,
      defaultIndex,
      allowEscapeViewBox,
      animationDuration,
      animationEasing,
      axisId,
      contentStyle,
      filterNull,
      isAnimationActive,
      itemSorter,
      itemStyle,
      labelStyle,
      reverseDirection,
      useTranslate3d,
      wrapperStyle,
      accessibilityLayer,
      ...props
    },
    ref,
  ) => {
    const { config } = useChart();

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload || payload.length === 0) {
        return null;
      }

      // Use labelFormatter if provided
      if (labelFormatter) {
        return labelFormatter(label, payload);
      }

      const [item] = payload;
      const key = `${labelkey || item?.dataKey || "value"}`;
      const itemConfig = config[key as keyof typeof config];
      const value =
        !labelkey && typeof label === "string"
          ? config[label as keyof typeof config]?.label || label
          : itemConfig?.label;

      if (labelkey) {
        return value;
      }

      return value || label;
    }, [label, labelkey, payload, hideLabel, config, labelFormatter]);

    if (!active || !payload || payload.length === 0) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={cn(
          "border-border/50 bg-background grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl",
          className,
        )}
        {...props}
      >
        {tooltipLabel && (
          <div className="text-foreground font-medium">{tooltipLabel}</div>
        )}
        <div className="grid gap-1.5">
          {payload.map((item: any, index: number) => {
            const key = `${nameKey || item.dataKey || "value"}`;
            const itemConfig = config[key as keyof typeof config];
            const indicatorColor = item.color || itemConfig?.color;

            // Use custom formatter if provided
            let displayValue = item.value;
            let displayName = itemConfig?.label || item.name;

            if (formatter) {
              const [formattedValue, formattedName] = formatter(
                item.value,
                item.name,
                item,
                index,
              );
              displayValue = formattedValue;
              if (formattedName) displayName = formattedName;
            }

            return (
              <div
                key={item.dataKey || index}
                className="[&>svg]:text-muted-foreground flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5"
              >
                {!hideIndicator && (
                  <div
                    className={cn(
                      "shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]",
                      {
                        "h-2.5 w-2.5": indicator === "dot",
                        "w-1": indicator === "line",
                        "w-0 border-[1.5px] border-dashed bg-transparent":
                          indicator === "dashed",
                        "my-0.5": hideLabel && indicator === "dashed",
                      },
                    )}
                    style={
                      {
                        "--color-bg": indicatorColor,
                        "--color-border": indicatorColor,
                      } as React.CSSProperties
                    }
                  />
                )}
                <div
                  className={cn(
                    "flex flex-1 justify-between leading-none",
                    hideLabel ? "items-center" : "flex-col",
                  )}
                >
                  <div className="grid gap-1.5">
                    <span className="text-muted-foreground">{displayName}</span>
                  </div>
                  {displayValue && (
                    <span className="text-foreground font-mono font-medium tabular-nums">
                      {typeof displayValue === "number"
                        ? displayValue.toLocaleString()
                        : displayValue}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);
ChartTooltipContent.displayName = "ChartTooltipContent";

// Legend interfaces with proper typing
interface ChartLegendProps {
  payload?: Array<{
    value: string;
    type?: string;
    id?: string;
    color?: string;
  }>;
  hideicon?: boolean;
  nameKey?: string;
}

const ChartLegend = RechartsPrimitive.Legend;

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & ChartLegendProps
>(({ className, hideicon = false, payload = [], nameKey, ...props }, ref) => {
  const { config } = useChart();

  if (!payload || payload.length === 0) {
    return null;
  }

  return (
    <div
      ref={ref}
      className={cn("flex items-center justify-center gap-4", className)}
      {...props}
    >
      {payload.map((item: any) => {
        const key = `${nameKey || item.value || item.dataKey}`;
        const itemConfig = config[key as keyof typeof config];

        return (
          <div
            key={item.value}
            className="[&>svg]:text-muted-foreground flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3"
          >
            {itemConfig?.icon && !hideicon ? (
              <itemConfig.icon />
            ) : (
              !hideicon && (
                <div
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{
                    backgroundColor: item.color,
                  }}
                />
              )
            )}
            <span className="text-muted-foreground">
              {itemConfig?.label || item.value}
            </span>
          </div>
        );
      })}
    </div>
  );
});
ChartLegendContent.displayName = "ChartLegendContent";

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
};
