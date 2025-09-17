"use client";
import { SectionCards } from "../_components/cardsection";
import { LazySection } from "@/components/common/LazySection";
import { ChartPieLegend } from "@/components/common/PieChart";
import TopSellingChartWrapper from "../../../components/common/Barchart";
import UserActivityTable from "../_components/userActivityTable";
import Charts from "./overview";
import { ReusableAreaChart } from "@/components/common/Chart";

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

// const ReusableAreaChart = dynamic(
//   () => import("@/components/common/Chart").then((m) => m.ReusableAreaChart),
//   {
//     ssr: false,
//     loading: () => (
//       <div className="h-64 w-full animate-pulse rounded-lg bg-gray-200" />
//     ),
//   },
// );

// const TopSellingChartWrapper = dynamic(
//   () => import("@/components/common/Barchart"),
//   {
//     ssr: false,
//     loading: () => (
//       <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
//     ),
//   },
// );
// const ChartPieLegend = dynamic(
//   () => import("@/components/common/PieChart").then((p) => p.ChartPieLegend),
//   {
//     ssr: false,
//     loading: () => (
//       <div className="h-[320px] w-full animate-pulse rounded-lg bg-gray-200" />
//     ),
//   },
// );
export default function DashboardContent({ result }: any) {
  const chartData = [
    { browser: "chrome", visitors: 275, fill: "var(--chart-1)" },
    { browser: "safari", visitors: 200, fill: "var(--chart-2)" },
    { browser: "firefox", visitors: 187, fill: "var(--chart-3)" },
    { browser: "edge", visitors: 173, fill: "var(--chart-4)" },
    { browser: "other", visitors: 90, fill: "var(--chart-5)" },
  ];
  if (!result) return <div>No data available</div>;
  const salesChartConfig = {
    revenue: { label: "الإيرادات", color: "var(--chart-2)" },
    purchases: { label: "المشتريات", color: "var(--chart-2)" },
  };
  return (
    <>
      {/* <Suspense
        fallback={
          <>
            <header className="h-32 animate-pulse rounded-lg bg-gray-200" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array(8)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={i}
                    className="h-50 animate-pulse rounded-lg bg-gray-200"
                  />
                ))}
            </div>
          </>
        }
      > */}
      <SectionCards
        salesSummary={{
          totalRevenu: result.summary.revenue.total,
          totalPurchces: result.summary.purchases.total,
          transactionsToday: result.summary.sales.total,
          totalDebtAmount: result.summary.debt.totalDebt,
          recivedDebtAmount: result.summary.debt.received,
        }}
        productStats={result.productStats}
        loading={false}
        totalusers={result.users.users}
        charts={{
          salesChart: result.summary.sales.chart,
          purchasesChart: result.summary.purchases.chart,
          revenueChart: result.summary.revenue.chart,
          debtChart: result.summary.debt.chart,
        }}
      />
      {/* </Suspense> */}

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
            data={result.combinedChartData}
            config={salesChartConfig}
          />
          <Charts topProducts={result.topProducts} formData={result.formData} />
          {/* <TopSellingChartWrapper
              data={result.topProducts}
              formData={result.formData}
              title="Top Sales"
              width=" w-sm md:w-3xl lg:w-5xl "
              widthco=" xl:w-2xl 2xl:w-4xl lg:w-5xs  sm:w-md  "
              dataKey="quantity"
              paramKey="topItems"
            /> */}
          {/* <Charts
            combinedChartData={result.combinedChartData}
            topProducts={result.topProducts}
            formData={result.formData}
          /> */}
        </div>
        {/* </Suspense> */}
        <div className="col-span-2 flex flex-col items-stretch gap-x-6 gap-y-6 lg:col-span-1">
          {/* <Suspense
            fallback={
              <div className="h-[320px] w-full animate-pulse rounded-lg bg-gray-200" />
            } 
          >*/}
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
          {/* <h1 className="text-center">recent sales</h1> */}

          <div className="rounded-2xl">
            {/* <h1 className="text-center">Users activity logs</h1> */}
            <UserActivityTable
              Sales={result.recentSales}
              total={result.pagination.total}
              logs={result.activityLogs}
              totals={result.activityLogs.length}
              sort={result.sort} // You might need to parse this from searchParams.sort
            />
          </div>
        </LazySection>
      </div>
    </>
  );
}
