"use client";

import dynamic from "next/dynamic";
import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, TrendingUp } from "lucide-react";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import { SelectField } from "@/components/common/selection";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useTablePrams } from "@/hooks/useTableParams";

const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), {
  ssr: false,
});
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), {
  ssr: false,
});
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), {
  ssr: false,
});
const LabelList = dynamic(() => import("recharts").then((m) => m.LabelList), {
  ssr: false,
});
// Dynamic imports for Recharts components (client-side only)
const BarChart = dynamic(() => import("recharts").then((m) => m.BarChart), {
  ssr: false,
  loading: () => (
    <div className="h-60 w-full animate-pulse rounded-lg bg-gray-700" />
  ),
});
// const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), {
//   ssr: false,
// });
// const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), {
//   ssr: false,
// });
// const Bar = dynamic(() => import("recharts").then((m) => m.Bar), {
//   ssr: false,
// });
// const LabelList = dynamic(() => import("recharts").then((m) => m.LabelList), {
//   ssr: false,
// });

type ProductClientProps = {
  data: any[];
  title: string;
  paramKey: string;
  width: string;
  widthco?: string;
  color: string;
  dataKey: "quantity" | "total"; // 👈 sales or revenue
  formData?: {
    warehouses: { id: string; name: string }[];
    categories: { id: string; name: string }[];
  };
};

export default function UniversalChart({
  data,
  title,
  dataKey,
  formData,
  width,
  widthco,
  color,
  paramKey,
}: ProductClientProps) {
  const chartConfig: ChartConfig = {
    [dataKey]: {
      label: dataKey === "quantity" ? "Top Selling" : "Revenue",
      color: "var(--chart-5)",
    },
    label: { color: "var(--background)" },
  };

  const [date, setData] = useState("");
  const { setParam } = useTablePrams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const updateCategories = (values: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(`${paramKey}`, values);
    router.push(`${pathname}?${params.toString()}`);
  };

  const Date = (values: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(`${paramKey}Date`, values);
    router.push(`${pathname}?${params.toString()}`);
  };

  const formatNumber = (num: number) => {
    if (num >= 1_000_000)
      return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
    return num.toString();
  };

  const xKey = dataKey === "quantity" ? "name" : "date";
  const labelText =
    dataKey === "quantity"
      ? "Showing the top-selling products by quantity"
      : "Showing revenue trends by date";

  const dates = [
    { id: "day", name: "day" },
    { id: "week", name: "week" },
    { id: "month", name: "month" },
    { id: "year", name: "year" },
  ];

  return (
    <Card className="bg-accent h-full w-full rounded-2xl shadow-xl/20 shadow-gray-500">
      <CardHeader className="space-y-2">
        <CardTitle>{title}</CardTitle>
        {formData && (
          <div className="flex justify-start lg:justify-between">
            <div>
              {/* <SelectField
                options={formData.categories}
                paramKey={paramKey}
                placeholder="Category"
              />
              <SelectField
                options={dates}
                paramKey={paramKey}
                placeholder="Date"
              /> */}
            </div>
            <div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    className="border-primary mr-auto border-2"
                  >
                    صفوف لكل صفحة <ChevronDown className="mr-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {[5, 10, 20, 50].map((size) => (
                    <DropdownMenuItem
                      key={size}
                      onClick={() => updateCategories(size.toString())}
                    >
                      {size} صفوف
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className={width}>
        {" "}
        <Suspense>
          <ChartContainer config={chartConfig} className={`h-60 ${widthco}`}>
            <BarChart data={data} margin={{ right: 5, left: 5 }}>
              <XAxis dataKey={xKey} />
              <YAxis tickFormatter={formatNumber} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    indicator="dashed"
                    formatter={(value: any) => [formatNumber(Number(value))]}
                  />
                }
                cursor={false}
                defaultIndex={1}
              />
              <Bar dataKey={dataKey} fill={color} radius={[4, 4, 4, 4]}>
                <LabelList
                  dataKey={dataKey}
                  position="top"
                  offset={3}
                  fontSize={13}
                  fontWeight="bold"
                  formatter={(value: any) => formatNumber(Number(value))}
                />
              </Bar>
            </BarChart>
          </ChartContainer>{" "}
        </Suspense>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 p-3 text-sm">
        <div className="flex items-center gap-2 leading-none">
          Trending up <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground leading-none">{labelText}</div>
      </CardFooter>
    </Card>
  );
}
