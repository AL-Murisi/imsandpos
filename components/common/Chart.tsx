"use client";
import React, { Suspense, useEffect, useState } from "react";
// import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
// Remove these imports from the top of your file
// import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import dynamic from "next/dynamic";

// Dynamic imports with better performance
const AreaChart = dynamic(
  () => import("recharts").then((m) => m.AreaChart),

  {
    ssr: false,
  },
);
const Area = dynamic(() => import("recharts").then((m) => m.Area), {
  ssr: false,
});
const CartesianGrid = dynamic(
  () => import("recharts").then((m) => m.CartesianGrid),
  { ssr: false },
);
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), {
  ssr: false,
});

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../../components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "../../components/ui/toggle-group";
import { useIsMobile } from "../../hooks/use-mobile";
import { CustomTooltipContent } from "./cuatomtool";

type ChartDataPoint = { date: string; [key: string]: number | string };
type TimeRangeOption = { label: string; value: string; days: number };

type Props = {
  title: string;
  description: string;
  data: ChartDataPoint[];
  config: ChartConfig;
  t: any;
  defaultTimeRange?: string;
  timeRanges?: TimeRangeOption[];
  referenceDate?: Date; // تاريخ الأساس للفلترة (افتراضياً اليوم)
  urlParamKey?: string; // مفتاح الـ URL param لتخزين timeRange لهذا المخطط
};

export function ReusableAreaChart({
  title,
  description,
  data,
  config,
  t,
  defaultTimeRange = "30d",
  timeRanges = [
    { label: "آخر 3 أشهر", value: "90d", days: 90 },
    { label: "آخر 30 يومًا", value: "30d", days: 30 },
    { label: "آخر 7 أيام", value: "7d", days: 7 },
  ],
  referenceDate = new Date(),
  urlParamKey = "chartTimeRange",
}: Props) {
  const isMobile = useIsMobile();

  const [timeRange, setTimeRange] = useState("30d");
  const groupByMonth = (data: any[], dateField: string) => {
    const grouped = new Map<string, number>();

    data.forEach((item) => {
      const dateObj = item[dateField];
      const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;

      // 🔥 FIX: Explicitly convert the BigInt value using Number()
      const rawValue = item._sum ? Object.values(item._sum)[0] : 0;
      const value = rawValue !== undefined ? Number(rawValue) : 0; // Use Number() for BigInt conversion

      grouped.set(monthKey, (grouped.get(monthKey) || 0) + (value || 0));
    });

    // ... rest of the function remains the same ...
    return Array.from(grouped.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };
  // لو موبايل، حدد الفترة الزمنية تلقائياً على 7 أيام بدل 90
  useEffect(() => {
    if (isMobile && timeRange === "90d") {
      setTimeRange("7d");
    }
  }, [isMobile, timeRange]);

  // تحديث الـ URL برقم الفترة الزمنية مع تأخير (debounce)

  // الحصول على عدد الأيام من timeRanges
  const selectedRange = timeRanges.find((r) => r.value === timeRange);
  const daysToSubtract = selectedRange ? selectedRange.days : 90;

  // فلترة البيانات بحسب التاريخ
  const filteredData = data?.filter((item) => {
    const date = new Date(item.date);
    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);
    return date >= startDate && date <= referenceDate;
  });

  return (
    <Card
      className="bg-accent @container/card rounded-2xl shadow-xl/20 shadow-gray-500"
      dir="rtl"
    >
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {/* <DateRangeFilter
          fromKey={`chartFrom`} // just needed for URL sync if you want
          toKey={`chartTo`}
        /> */}
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            {timeRanges.map(({ value, label }) => (
              <ToggleGroupItem key={value} value={value}>
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="اختر فترة زمنية"
            >
              <SelectValue placeholder={timeRanges[0].label} />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {timeRanges.map(({ value, label }) => (
                <SelectItem key={value} value={value} className="rounded-lg">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <Suspense>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <ChartContainer
            config={config}
            className="aspect-auto h-[324px] w-full"
          >
            <AreaChart data={filteredData}>
              <defs>
                {Object.entries(config).map(([key, conf]) => (
                  <linearGradient
                    key={`fill-${key}`}
                    id={`fill${key.charAt(0).toUpperCase() + key.slice(1)}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={"var(--chart-2)"}
                      stopOpacity={1.0}
                    />
                    <stop
                      offset="95%"
                      stopColor={"var(--chart-4)"}
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString("ar-EG", {
                    month: "short",
                    day: "numeric",
                  });
                }}
                reversed={true} // لتكون التواريخ من اليمين لليسار في المحور X
              />
              {/* <ChartTooltip
                content={
                  <CustomTooltipContent
                    labelFormatter={(value) =>
                      new Date(t(value)).toLocaleDateString("ar-EG", {
                        month: "short",
                        day: "numeric",
                      })
                    }
                    indicator="dot"
                  />
                }
              /> */}
              <ChartTooltip
                content={
                  <CustomTooltipContent
                    labelFormatter={(label, dataKey) => t(dataKey || label)}
                    indicator="dot"
                  />
                }
              />

              {Object.entries(config).map(([key, conf]) => (
                <Area
                  key={key}
                  dataKey={key}
                  type="natural"
                  fill={`url(#fill${key.charAt(0).toUpperCase() + key.slice(1)})`}
                  stroke={conf.color}
                  stackId={key} // different stackId per line disables stacking between them
                />
              ))}
            </AreaChart>
          </ChartContainer>
        </CardContent>{" "}
      </Suspense>
    </Card>
  );
}
// "use client";

// import * as React from "react";
// import {
//   Card,
//   CardAction,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "../../components/ui/card";
// import {
//   ChartConfig,
//   ChartContainer,
//   ChartTooltip,
//   ChartTooltipContent,
// } from "../../components/ui/chart";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "../../components/ui/select";
// import { ToggleGroup, ToggleGroupItem } from "../../components/ui/toggle-group";
// import { useIsMobile } from "../../hooks/use-mobile";
// import { DateRangeFilter } from "./testting";
// import dynamic from "next/dynamic";
// import { AreaChart } from "lucide-react";
// import { Area, CartesianGrid, XAxis } from "recharts";

// // Dynamic imports with better performance
// // const AreaChart = dynamic(() => import("recharts").then((m) => m.AreaChart), {
// //   ssr: false,
// //   loading: () => <div className="h-[250px] animate-pulse bg-gray-200" />,
// // });
// // const Area = dynamic(() => import("recharts").then((m) => m.Area), {
// //   ssr: false,
// // });
// // const CartesianGrid = dynamic(
// //   () => import("recharts").then((m) => m.CartesianGrid),
// //   { ssr: false }
// // );
// // const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), {
// //   ssr: false,
// // });

// type ChartDataPoint = { date: string; [key: string]: number | string };
// type TimeRangeOption = { label: string; value: string; days: number };

// type Props = {
//   title: string;
//   description: string;
//   data: ChartDataPoint[];
//   config: ChartConfig;
//   defaultTimeRange?: string;
//   timeRanges?: TimeRangeOption[];
//   referenceDate?: Date;
//   urlParamKey?: string;
// };

// export const ReusableAreaChart = React.memo(function ReusableAreaChart({
//   title,
//   description,
//   data,
//   config,
//   defaultTimeRange = "30d",
//   timeRanges = [
//     { label: "آخر 3 أشهر", value: "90d", days: 90 },
//     { label: "آخر 30 يومًا", value: "30d", days: 30 },
//     { label: "آخر 7 أيام", value: "7d", days: 7 },
//   ],
//   referenceDate = new Date(),
//   urlParamKey = "chartTimeRange",
// }: Props) {
//   const isMobile = useIsMobile();
//   const [timeRange, setTimeRange] = React.useState(isMobile ? "7d" : "30d");

//   // Memoize filtered data to prevent unnecessary recalculations
//   const filteredData = React.useMemo(() => {
//     const selectedRange = timeRanges.find((r) => r.value === timeRange);
//     const daysToSubtract = selectedRange ? selectedRange.days : 30;
//     const startDate = new Date(referenceDate);
//     startDate.setDate(startDate.getDate() - daysToSubtract);

//     return data.filter((item) => {
//       const date = new Date(item.date);
//       return date >= startDate && date <= referenceDate;
//     });
//   }, [data, timeRange, timeRanges, referenceDate]);

//   const gradientDefs = React.useMemo(
//     () =>
//       Object.entries(config).map(([key, conf]) => (
//         <linearGradient
//           key={`fill-${key}`}
//           id={`fill${key.charAt(0).toUpperCase() + key.slice(1)}`}
//           x1="0"
//           y1="0"
//           x2="0"
//           y2="1"
//         >
//           <stop offset="5%" stopColor={conf.color} stopOpacity={1.0} />
//           <stop offset="95%" stopColor={conf.color} stopOpacity={0.1} />
//         </linearGradient>
//       )),
//     [config]
//   );

//   return (
//     <Card
//       className="@container/card dark:bg-primary-foreground bg-chart-3"
//       dir="rtl"
//     >
//       <CardHeader>
//         <CardTitle>{title}</CardTitle>
//         <CardDescription>{description}</CardDescription>
//         <DateRangeFilter fromKey="chartFrom" toKey="chartTo" />
//         <CardAction>
//           <ToggleGroup
//             type="single"
//             value={timeRange}
//             onValueChange={setTimeRange}
//             variant="outline"
//             className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
//           >
//             {timeRanges.map(({ value, label }) => (
//               <ToggleGroupItem key={value} value={value}>
//                 {label}
//               </ToggleGroupItem>
//             ))}
//           </ToggleGroup>

//           <Select value={timeRange} onValueChange={setTimeRange}>
//             <SelectTrigger className="flex w-40 @[767px]/card:hidden" size="sm">
//               <SelectValue placeholder={timeRanges[0].label} />
//             </SelectTrigger>
//             <SelectContent className="rounded-xl">
//               {timeRanges.map(({ value, label }) => (
//                 <SelectItem key={value} value={value} className="rounded-lg">
//                   {label}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </CardAction>
//       </CardHeader>
//       <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
//         <ChartContainer
//           config={config}
//           className="aspect-auto h-[250px] w-full"
//         >
//           <AreaChart data={filteredData}>
//             <defs>{gradientDefs}</defs>
//             <CartesianGrid vertical={false} />
//             <XAxis
//               dataKey="date"
//               tickLine={false}
//               axisLine={false}
//               tickMargin={8}
//               minTickGap={32}
//               tickFormatter={(value) => {
//                 const date = new Date(value);
//                 return date.toLocaleDateString("ar-EG", {
//                   month: "short",
//                   day: "numeric",
//                 });
//               }}
//               reversed={true}
//             />
//             <ChartTooltip
//               cursor={false}
//               defaultIndex={isMobile ? -1 : 10}
//               content={
//                 <ChartTooltipContent
//                   labelFormatter={(value) =>
//                     new Date(value).toLocaleDateString("ar-EG", {
//                       month: "short",
//                       day: "numeric",
//                     })
//                   }
//                   indicator="dot"
//                 />
//               }
//             />
//             {Object.entries(config).map(([key, conf]) => (
//               <Area
//                 key={key}
//                 dataKey={key}
//                 type="natural"
//                 fill={`url(#fill${key.charAt(0).toUpperCase() + key.slice(1)})`}
//                 stroke={conf.color}
//                 stackId="a"
//               />
//             ))}
//           </AreaChart>
//         </ChartContainer>
//       </CardContent>
//     </Card>
//   );
// });
