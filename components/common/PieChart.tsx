"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";

// 🌀 Dynamic imports for Recharts
const PieChart = dynamic(() => import("recharts").then((m) => m.PieChart), {
  ssr: false,
  loading: () => (
    <div className="mx-auto aspect-square max-h-[400px] animate-pulse rounded-lg bg-gray-200" />
  ),
});
const Pie = dynamic(() => import("recharts").then((m) => m.Pie), {
  ssr: false,
});

// 🧠 Props
type PieChartProps = {
  chartData: {
    id: number;
    browser: string;
    visitors: number;
    fill: string;
    percentage?: string;
  }[];
  startDate?: string;
  endDate?: string;
};

// ✅ Component
export function ChartPieLegend({
  chartData,
  startDate,
  endDate,
}: PieChartProps) {
  const chartConfig: ChartConfig = {
    visitors: { label: "المصروفات" },
  };

  return (
    <Card className="bg-accent flex h-full w-full flex-col shadow-xl/20 shadow-gray-500">
      <CardHeader className="items-center pb-0 text-center">
        <CardTitle>توزيع المصروفات حسب الفئة</CardTitle>
        <CardDescription>
          {startDate && endDate
            ? `من ${new Date(startDate).toLocaleDateString("ar-EG")} إلى ${new Date(
                endDate,
              ).toLocaleDateString("ar-EG")}`
            : "خلال الفترة المحددة"}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 pb-0">
        <Suspense>
          {chartData && chartData.length > 0 ? (
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square max-h-[320px] w-full"
            >
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="visitors"
                  nameKey="browser"
                  cx="50%"
                  cy="43%"
                  outerRadius="90%"
                  innerRadius="0%"
                  label={(entry: any) => {
                    const RADIAN = Math.PI / 180;
                    const radius = Number(entry.outerRadius || 0) * 1.2;
                    const x =
                      Number(entry.cx || 0) +
                      radius * Math.cos(-Number(entry.midAngle || 0) * RADIAN);
                    const y =
                      Number(entry.cy || 0) +
                      radius * Math.sin(-Number(entry.midAngle || 0) * RADIAN);

                    return (
                      <text
                        x={x}
                        y={y}
                        fill="currentColor"
                        textAnchor={x > Number(entry.cx || 0) ? "start" : "end"}
                        dominantBaseline="central"
                        className="text-sm font-medium text-shadow-amber-800"
                      >
                        {`${entry.browser} (${entry.percentage}%)`}
                      </text>
                    );
                  }}
                  labelLine={{
                    stroke: "currentColor",
                    strokeWidth: 1,
                  }}
                />

                <ChartLegend
                  content={<ChartLegendContent nameKey="browser" />}
                  className="mt-2 flex-wrap justify-center gap-2 *:basis-1/3"
                />
              </PieChart>
            </ChartContainer>
          ) : (
            <div className="flex h-48 items-center justify-center text-gray-500">
              لا توجد بيانات للمصروفات خلال هذه الفترة
            </div>
          )}
        </Suspense>
      </CardContent>
    </Card>
  );
}
