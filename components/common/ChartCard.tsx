"use client";

// Remove these imports from the top of your file
// import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import dynamic from "next/dynamic";
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), {
  ssr: false,
});

const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), {
  ssr: false,
});

const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer),
  {
    ssr: false,
    loading: () => (
      <div className="h-24 animate-pulse rounded-2xl bg-gray-600" />
    ),
  },
);

// Dynamic imports with better performance
const AreaChart = dynamic(() => import("recharts").then((m) => m.AreaChart), {
  ssr: false,
  loading: () => <div className="h-24 animate-pulse rounded-2xl bg-gray-700" />,
});

const Area = dynamic(() => import("recharts").then((m) => m.Area), {
  ssr: false,
  loading: () => <div className="h-24 animate-pulse rounded-2xl bg-gray-700" />,
});

const CartesianGrid = dynamic(
  () => import("recharts").then((m) => m.CartesianGrid),
  { ssr: false },
);

const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), {
  ssr: false,
});
import { format } from "date-fns/format";
import Link from "next/link";

import { IconClick } from "@tabler/icons-react";
import { Label } from "../ui/label";
import { MoreHorizontal, MoreVertical, Loader2 } from "lucide-react";
import { useFormatter } from "@/hooks/usePrice";
import { Suspense } from "react";

interface ChartCardProps {
  icon: React.ReactNode;
  title: string | number;
  label: string;
  title2?: any;
  label2?: string;
  bg?: string;
  description: string;
  link?: string;
  loading: boolean;
  chartData?: { date: string; value: number }[];
  chartConfig?: {
    stroke: string;
    fill: string;
    dateFormat?: string;
    label: string;
  };
}

export function ChartCard({
  icon,
  title,
  label,
  label2,
  bg,
  title2,
  description,
  link,
  loading,
  chartData,
  chartConfig,
}: ChartCardProps) {
  const { formatCurrency, formatPriceK, formatQty } = useFormatter();
  return (
    <div
      className={`flex flex-col rounded-2xl p-4 ${bg} gap-6 shadow-xl/20 shadow-gray-500`}
    >
      {loading ? (
        <Loader2 className="h-8 w-8 animate-spin" />
      ) : (
        <div className={`text-lg`}>
          {/* Top Row */}
          {chartConfig ? (
            <>
              <MoreVertical color="black" />
              <div className="flex justify-between gap-2">
                <div className="dark:bg-secondary-foreground bg-primary-foreground flex h-20 w-20 items-center justify-center rounded-full">
                  {icon}
                </div>
                <div className="text-center text-white">
                  {formatCurrency(Number(title)) || 0}
                </div>
              </div>

              {/* Label */}
              <div className="text-end text-white">{label}</div>

              {/* Chart */}

              <div className="mt-2 h-24 w-full flex-1 rounded-3xl">
                {chartData && chartData.length > 0 ? (
                  <Suspense>
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                      className="dark:bg-accent bg-accent-foreground rounded-2xl"
                    >
                      <AreaChart data={chartData}>
                        <XAxis
                          dataKey="date"
                          hide={false}
                          tickFormatter={(dateStr) =>
                            chartConfig?.dateFormat
                              ? format(
                                  new Date(dateStr),
                                  chartConfig.dateFormat,
                                )
                              : dateStr
                          }
                        />
                        <YAxis hide domain={["auto", "auto"]} />
                        <Tooltip
                          content={
                            <CustomTooltip
                              labelName={chartConfig?.label || ""}
                            />
                          }
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke={chartConfig.stroke || "#4ade80"}
                          fill={chartConfig.fill || "#4ade80"}
                          strokeWidth={2}
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Suspense>
                ) : (
                  <Label className="h-full w-full bg-transparent">
                    no data in {chartConfig?.dateFormat}
                  </Label>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between gap-2">
                <div className="dark:bg-secondary-foreground bg-primary-foreground flex h-20 w-20 items-center justify-center rounded-full">
                  {icon}
                </div>

                <div className="text-white">
                  {/* If we have a second title, show both labels */}
                  {title2 && label2 ? (
                    <div className="flex flex-col gap-2">
                      <div className="grid grid-cols-2 justify-between gap-3">
                        <div className="text-end text-white">{label}</div>

                        <div className="text-end text-white">
                          {title ?? "—"}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 justify-between gap-3">
                        <div className="text-end text-white">{label2}</div>

                        <div className="text-end text-white">
                          {title2 ?? "—"}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Otherwise show just one line without showing "0"
                    <Label>{title ?? "—"}</Label>
                  )}
                </div>
              </div>

              {/* Label */}
              <div className="text-end text-white">{label}</div>

              {/* Optional: Show "لا توجد بيانات" if no chart data */}
              {/* {(!chartData || chartData.length === 0) && (
                <div className="mt-2 text-center text-sm text-gray-200">
                  لا توجد بيانات
                </div>
              )} */}
            </>
          )}
          {link && (
            <div className="flex items-end">
              <Link className="flex items-center" href={link}>
                <Label>view</Label>
                <IconClick />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload: { date: string; value: number } }[];
  label?: string;
  labelName?: string;
}

export function CustomTooltip({
  active,
  payload,
  label,
  labelName,
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;

  return (
    <div className="rounded border border-gray-300 bg-white p-2 text-sm text-gray-900 shadow-lg">
      <div>
        <strong>{labelName}</strong>
      </div>
      <div>{new Date(data.date).toLocaleDateString("ar-EG")}</div>
      <div>Value: {data.value.toLocaleString()}</div>
    </div>
  );
}
