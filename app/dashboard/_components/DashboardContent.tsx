import { LazySection } from "@/components/common/LazySection";
import { ChartPieLegend } from "@/components/common/PieChart";
import TopSellingChartWrapper from "../../../components/common/Barchart";
import UserActivityTable from "../_components/userActivityTable";
import Charts from "./overview";
import { ReusableAreaChart } from "@/components/common/Chart";
import SearchInput from "@/components/common/searchtest";
import { ScrollArea } from "@/components/ui/scroll-area";
import SectionCards from "./cardsection";
import { getTranslations } from "next-intl/server";

interface DashboardData {
  summary: any;
  productStats: any;
  users: any;
  recentSales: any;
  topProducts: any;
  activityLogs: any;
  combinedChartData: any;
  formData: any;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

interface DashboardContentProps {
  searchParams: {
    from?: string;
    to?: string;
    categoryId?: string;
    query?: string;
    page?: string;
    limit?: string;
    allFrom?: string;
    allTo?: string;
    salesFrom?: string;
    salesTo?: string;
    purchasesFrom?: string;
    purchasesTo?: string;
    revenueFrom?: string;
    revenueTo?: string;
    debtFrom?: string;
    debtTo?: string;
    chartTo?: string;
    chartFrom?: string;
    sort?: string;
  };
}

export default async function DashboardContent({ result, salesSummary }: any) {
  const combinedChartData = salesSummary.sales.chart.map((sale: any) => {
    const purchase = salesSummary.purchases.chart.find(
      (p: any) => p.date === sale.date,
    );
    return {
      date: sale.date,
      revenue: sale.value,
      purchases: purchase?.value || 0,
    };
  });
  const chartData = [
    { id: 1, browser: "chrome", visitors: 275, fill: "var(--chart-1)" },
    { id: 2, browser: "safari", visitors: 200, fill: "var(--chart-2)" },
    { id: 3, browser: "firefox", visitors: 187, fill: "var(--chart-3)" },
    { id: 4, browser: "edge", visitors: 173, fill: "var(--chart-4)" },
    { id: 5, browser: "other", visitors: 90, fill: "var(--chart-5)" },
  ];
  if (!result) return <div>No data available</div>;
  const t = await getTranslations("cards");
  const salesChartConfig = {
    revenue: { label: t("revenue"), color: "#dc2626" },
    purchases: { label: t("purchases"), color: "#3b82f6" },
  };
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-6 bg-transparent lg:grid-cols-3">
      {/* <Suspense
          fallback={
            <>
              <div className="grid h-64 w-full grid-cols-2 gap-4 sm:grid-cols-2 xl:grid-cols-4" />
              <div className="h-[40vh] w-70 animate-pulse rounded-lg bg-gray-200" />
              <div className="h-[40vh] w-70 animate-pulse rounded-lg bg-gray-200" />
            </>
          }
        > */}
      <div className="col-span-2 flex flex-col gap-5 lg:col-span-2">
        <ReusableAreaChart
          title="Sales Overview"
          description="Sales trends over selected period"
          data={combinedChartData}
          config={salesChartConfig}
        />
        <Charts topProducts={result.topProducts} formData={result.formData} />
      </div>

      <div className="col-span-2 flex flex-col items-stretch gap-x-6 gap-y-6 lg:col-span-1">
        <TopSellingChartWrapper
          data={result.revenue}
          formData={result.formData}
          title={"selles"}
          width="min-w-2xs md:max-w-2xl"
          widthco="  w-full "
          dataKey="total"
          paramKey="revnue"
        />{" "}
        <ChartPieLegend chartData={chartData} /> {/* </Suspense> */}
      </div>
      <LazySection>
        <div className="rounded-2xl">
          <UserActivityTable
            Sales={result.recentSales}
            total={result.pagination.total}
            logs={result.activityLogs}
            totals={result.activityLogs.length}
            sort={result.sort}
          />
        </div>
      </LazySection>
    </div>
  );
}
// import { LazySection } from "@/components/common/LazySection";
// import { ChartPieLegend } from "@/components/common/PieChart";
// import TopSellingChartWrapper from "../../../components/common/Barchart";
// import UserActivityTable from "../_components/userActivityTable";
// import Charts from "./overview";
// import { ReusableAreaChart } from "@/components/common/Chart";
// import SearchInput from "@/components/common/searchtest";
// import { ScrollArea } from "@/components/ui/scroll-area";
// import SectionCards from "./cardsection";
// import { getActivityLogs } from "@/app/actions/activitylogs";
// import {
//   getTopSellingProducts,
//   FetchDebtSales,
//   fetchrevnu,
// } from "@/app/actions/sells";
// import { fetchAllFormData } from "@/app/actions/roles";
// import { Prisma } from "@prisma/client";
// import { ParsedSort } from "@/hooks/sort";
// interface DashboardData {
//   summary: any;
//   productStats: any;
//   users: any;
//   recentSales: any;
//   topProducts: any;
//   activityLogs: any;
//   combinedChartData: any;
//   formData: any;
//   pagination: {
//     page: number;
//     limit: number;
//     total: number;
//   };
// }

// interface DashboardContentProps {
//   searchParam: {
//     from?: string;
//     to?: string;
//     categoryId?: string;
//     query?: string;
//     page?: string;
//     limit?: string;
//     allFrom?: string;
//     allTo?: string;
//     salesFrom?: string;
//     salesTo?: string;
//     purchasesFrom?: string;
//     purchasesTo?: string;
//     revenueFrom?: string;
//     revenueTo?: string;
//     debtFrom?: string;
//     debtTo?: string;
//     chartTo?: string;
//     chartFrom?: string;
//     sort?: string;
//     topItems?: string;
//     revnueDate?: string;
//   };
//   result?: any;
//   salesSummary: any;
// }

// export default async function DashboardContent({
//   result,
//   salesSummary,
//   searchParam,
// }: DashboardContentProps) {
//   const searchParams = await searchParam;
//   const combinedChartData = salesSummary.sales.chart.map((sale: any) => {
//     const purchase = salesSummary.purchases.chart.find(
//       (p: any) => p.date === sale.date,
//     );
//     return {
//       date: sale.date,
//       revenue: sale.value,
//       purchases: purchase?.value || 0,
//     };
//   });
//   const pageIndex = Number(searchParams.page ?? 1) - 1;
//   const pageSize = Number(searchParams.limit ?? 5);
//   const parsedSort = ParsedSort(searchParams.sort);

//   // Create filter for debt sales
//   const filter: Prisma.SaleWhereInput = {
//     // Add your filter logic here if needed
//   };

//   const [recentSales, topProducts, activityLogs, formData, revenue] =
//     await Promise.all([
//       FetchDebtSales(
//         filter,
//         searchParams.query,
//         searchParams.from,
//         searchParams.to,
//         pageIndex,
//         pageSize,
//         parsedSort,
//       ),
//       getTopSellingProducts(
//         Number(searchParams.topItems ?? 7),
//         searchParams.from,
//         searchParams.to,
//         searchParams.categoryId,
//       ),
//       getActivityLogs(pageIndex, pageSize, parsedSort),
//       fetchAllFormData(),
//       fetchrevnu(
//         searchParams.allFrom,
//         searchParams.allTo,
//         searchParams.revnueDate,
//       ),
//     ]);
//   const responseData = serializeBigInt({
//     topProducts,
//   });
//   const chartData = [
//     { id: 1, browser: "chrome", visitors: 275, fill: "var(--chart-1)" },
//     { id: 2, browser: "safari", visitors: 200, fill: "var(--chart-2)" },
//     { id: 3, browser: "firefox", visitors: 187, fill: "var(--chart-3)" },
//     { id: 4, browser: "edge", visitors: 173, fill: "var(--chart-4)" },
//     { id: 5, browser: "other", visitors: 90, fill: "var(--chart-5)" },
//   ];
//   if (!result) return <div>No data available</div>;
//   const salesChartConfig = {
//     revenue: { label: "الإيرادات", color: "#dc2626" },
//     purchases: { label: "المشتريات", color: "#3b82f6" },
//   };
//   return (
//     <div className="grid grid-cols-1 gap-x-6 gap-y-6 bg-transparent lg:grid-cols-3">
//       {/* <Suspense
//           fallback={
//             <>
//               <div className="grid h-64 w-full grid-cols-2 gap-4 sm:grid-cols-2 xl:grid-cols-4" />
//               <div className="h-[40vh] w-70 animate-pulse rounded-lg bg-gray-200" />
//               <div className="h-[40vh] w-70 animate-pulse rounded-lg bg-gray-200" />
//             </>
//           }
//         > */}
//       <div className="col-span-2 flex flex-col gap-5 lg:col-span-2">
//         <ReusableAreaChart
//           title="Sales Overview"
//           description="Sales trends over selected period"
//           data={combinedChartData}
//           config={salesChartConfig}
//         />
//         <Charts topProducts={responseData.topProducts} formData={formData} />
//       </div>

//       <div className="col-span-2 flex flex-col items-stretch gap-x-6 gap-y-6 lg:col-span-1">
//         <TopSellingChartWrapper
//           data={revenue}
//           formData={formData}
//           title={"selles"}
//           width="min-w-2xs md:max-w-2xl"
//           widthco="  w-full "
//           dataKey="total"
//           paramKey="revnue"
//         />{" "}
//         <ChartPieLegend chartData={chartData} /> {/* </Suspense> */}
//       </div>
//       <LazySection>
//         <div className="rounded-2xl">
//           <UserActivityTable
//             Sales={recentSales}
//             total={recentSales.length}
//             logs={activityLogs}
//             totals={activityLogs.length}
//             sort={result.sort}
//           />
//         </div>
//       </LazySection>
//     </div>
//   );
// }

// function serializeBigInt(obj: any): any {
//   if (obj === null || obj === undefined) {
//     return obj;
//   }

//   if (typeof obj === "bigint") {
//     return obj.toString();
//   }

//   if (Array.isArray(obj)) {
//     return obj.map(serializeBigInt);
//   }

//   if (typeof obj === "object") {
//     const serialized: any = {};
//     for (const key in obj) {
//       if (obj.hasOwnProperty(key)) {
//         serialized[key] = serializeBigInt(obj[key]);
//       }
//     }
//     return serialized;
//   }

//   return obj;
// }
