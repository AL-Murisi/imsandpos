// "use client";
// import { BarChart, Bar, XAxis, YAxis, LabelList } from "recharts";
// import { ChevronDown, TrendingUp } from "lucide-react";

// import {
//   Card,
//   CardContent,
//   CardFooter,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import {
//   ChartContainer,
//   ChartTooltip,
//   ChartTooltipContent,
//   ChartConfig,
// } from "@/components/ui/chart";
// import { SelectField } from "@/components/common/selection";

// import { useTablePrams } from "@/hooks/useTableParams";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { Button } from "@/components/ui/button";
// import { usePathname, useRouter, useSearchParams } from "next/navigation";

// type Option = {
//   id: string;
//   name: string;
// };

// type DateRange = {
//   from: Date | null;
//   to: Date | null;
// };
// type ProductClientProps = {
//   products: any[];
//   tital: string;
//   dataKey: string; // 👈 new prop to handle both "quantity" and "total"

//   formData: {
//     warehouses: { id: string; name: string }[];
//     categories: { id: string; name: string }[];
//   };
// };

// export default function TopSellingChartWrapper({
//   products,
//   tital,
//   dataKey,
//   formData,
// }: ProductClientProps) {
//   const chartConfig = {
//     quantity: {
//       label: "Top Selling",
//       color: "var(--chart-5)",
//     },

//     label: {
//       color: "var(--background)",
//     },
//   } satisfies ChartConfig;
//   const {
//     pagination,
//     sorting,
//     globalFilter,
//     setPagination,
//     setSorting,
//     setGlobalFilter,
//     warehouseId,
//     supplierId,
//     categoryId,
//     setParam,
//   } = useTablePrams();
//   const searchParams = useSearchParams();
//   const router = useRouter();
//   const pathname = usePathname();

//   const updateCategories = (values: string) => {
//     const params = new URLSearchParams(searchParams.toString());

//     params.set("topnum", values);

//     // add new array values

//     router.push(`${pathname}?${params.toString()}`);
//   };
//   return (
//     <Card className="rounded-2xl bg-accent shadow-2xl ">
//       <CardHeader className="space-y-2">
//         <CardTitle>{tital} </CardTitle>
//         <div className="flex flex-row justify-between">
//           <SelectField
//             options={formData.categories}
//             onValueChange={(value) => setParam("categoryId", value)}
//             placeholder="Category"
//           />
//           <div>
//             <DropdownMenu>
//               <DropdownMenuTrigger asChild>
//                 <Button
//                   variant="secondary"
//                   className="mr-auto border-2 border-primary" // Use mr-auto for right alignment
//                 >
//                   صفوف لكل صفحة <ChevronDown className="mr-2 h-4 w-4" />{" "}
//                   {/* Move the icon to the left */}
//                 </Button>
//               </DropdownMenuTrigger>
//               <DropdownMenuContent align="start">
//                 {" "}
//                 {/* Align to the start (right) for RTL */}
//                 {[5, 10, 20, 50].map((size) => (
//                   <DropdownMenuItem
//                     key={size}
//                     onClick={() => updateCategories(size.toString())}
//                   >
//                     {size} صفوف
//                   </DropdownMenuItem>
//                 ))}
//                 <DropdownMenuSeparator />
//                 {/* <DropdownMenuItem onClick={() => table.setPageSize(5)}>
//                       إعادة ضبط
//                     </DropdownMenuItem> */}
//               </DropdownMenuContent>
//             </DropdownMenu>
//           </div>
//         </div>
//       </CardHeader>

//       <CardContent>
//         <ChartContainer config={chartConfig} className="h-56 w-full ">
//           <BarChart
//             data={products}
//             margin={{ right: 12, left: 12 }}
//             width={600}
//             height={300}
//           >
//             <XAxis dataKey="name" />
//             <YAxis
//               dataKey="quantity"
//               tickMargin={12}
//               fill="red"
//               className="bg-amber-300 "
//             />
//             <ChartTooltip
//               content={<ChartTooltipContent indicator="dashed" />}
//               cursor={false}
//               defaultIndex={1}
//             />

//             <Bar
//               dataKey="quantity"
//               fill="var(--chart-3)"
//               barSize={30}
//               radius={[4, 4, 4, 4]}
//             >
//               <LabelList
//                 dataKey="quantity"
//                 position="top"
//                 offset={3}
//                 className="bg-amber-50 "
//                 fontSize={12}
//               />
//             </Bar>
//           </BarChart>
//         </ChartContainer>
//       </CardContent>

//       <CardFooter className="flex-col items-start gap-2 text-sm">
//         <div className="flex items-center gap-2 font-medium leading-none">
//           Trending up based on sales <TrendingUp className="h-4 w-4" />
//         </div>
//         <div className="text-muted-foreground leading-none">
//           Showing the top-selling products by quantity
//         </div>
//       </CardFooter>
//     </Card>
//   );
// }
"use client";

import dynamic from "next/dynamic";
const BarChart = dynamic(() => import("recharts").then((m) => m.BarChart), {
  ssr: false,
});
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), {
  ssr: false,
});
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), {
  ssr: false,
});
const LabelList = dynamic(() => import("recharts").then((m) => m.LabelList), {
  ssr: false,
});
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), {
  ssr: false,
});
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
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTablePrams } from "@/hooks/useTableParams";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Scrollbar } from "@radix-ui/react-scroll-area";

type ProductClientProps = {
  data: any[];
  title: string;
  paramKey: string;
  width: string;
  widthco?: string;
  dataKey: "quantity" | "total"; // 👈 choose between sales or revenue
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
  paramKey,
}: ProductClientProps) {
  const chartConfig: ChartConfig = {
    [dataKey]: {
      label: dataKey === "quantity" ? "Top Selling" : "Revenue",
      color: "var(--chart-5)",
    },
    label: {
      color: "var(--background)",
    },
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

  // Dynamic keys based on chart type
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
    <Card className="bg-accent h-full w-full rounded-2xl shadow-2xl">
      <CardHeader className="space-y-2">
        <CardTitle>{title}</CardTitle>

        {formData && (
          <div className="flex justify-start lg:justify-between">
            <div>
              <SelectField
                options={formData.categories}
                onValueChange={(value) => setParam("categoryId", value)}
                placeholder="Category"
              />
              <SelectField
                options={dates}
                onValueChange={(value) => Date(value)}
                placeholder="date"
              />
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
      {/* <ScrollArea className={` w-auto p-2 `}> */}
      <CardContent className={`${width}`}>
        <ChartContainer config={chartConfig} className={`h-50 ${widthco} `}>
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

            <Bar
              dataKey={dataKey}
              fill="var(--chart-3)"
              barSize={30}
              radius={[4, 4, 4, 4]}
            >
              <LabelList
                dataKey={dataKey}
                position="top"
                offset={3}
                fontSize={13}
                fontWeight={"bold"}
                formatter={(value: any) => formatNumber(Number(value))}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
        <Scrollbar orientation="horizontal" />
      </CardContent>
      {/* </ScrollArea> */}
      <CardFooter className="flex-col items-start gap-2 p-3 text-sm">
        <div className="flex items-center gap-2 leading-none">
          Trending up <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground leading-none">{labelText}</div>
      </CardFooter>
    </Card>
  );
}
