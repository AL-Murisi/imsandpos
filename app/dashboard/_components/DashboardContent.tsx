// app/dashboard/_components/DashboardContentClient.tsx
"use client";

import { useMemo, lazy, Suspense } from "react";

// Lazy load heavy chart components
const ReusableAreaChart = lazy(() =>
  import("@/components/common/Chart").then((m) => ({
    default: m.ReusableAreaChart,
  })),
);

const Charts = lazy(() => import("./overview"));

const TopSellingChartWrapper = lazy(
  () => import("@/components/common/Barchart"),
);

const ChartPieLegend = lazy(() =>
  import("@/components/common/PieChart").then((m) => ({
    default: m.ChartPieLegend,
  })),
);

const UserActivityTable = lazy(() => import("./userActivityTable"));

const LazySection = lazy(() =>
  import("@/components/common/LazySection").then((m) => ({
    default: m.LazySection,
  })),
);

// Lightweight skeletons
const ChartSkeleton = () => (
  <div className="bg-card h-[400px] rounded-lg border p-6">
    <div className="mb-2 h-6 w-1/3 animate-pulse rounded bg-gray-200" />
    <div className="mb-4 h-4 w-1/2 animate-pulse rounded bg-gray-100" />
    <div className="h-full animate-pulse rounded bg-gray-50" />
  </div>
);

const TableSkeleton = () => (
  <div className="h-[500px] animate-pulse rounded bg-gray-200" />
);

interface DashboardContentClientProps {
  result: any;
  salesSummary: any;
}

export default function DashboardContent({
  result,
  salesSummary,
}: DashboardContentClientProps) {
  // Memoize expensive data transformations
  const combinedChartData = useMemo(() => {
    if (!salesSummary?.sales?.chart || !salesSummary?.purchases?.chart)
      return [];

    return salesSummary.sales.chart.map((sale: any) => {
      const purchase = salesSummary.purchases.chart.find(
        (p: any) => p.date === sale.date,
      );
      return {
        date: sale.date,
        revenue: sale.value,
        purchases: purchase?.value || 0,
      };
    });
  }, [salesSummary]);

  const salesChartConfig = useMemo(
    () => ({
      revenue: { label: "Revenue", color: "#dc2626" },
      purchases: { label: "Purchases", color: "#3b82f6" },
    }),
    [],
  );

  const staticChartData = useMemo(
    () => [
      { id: 1, browser: "chrome", visitors: 275, fill: "var(--chart-1)" },
      { id: 2, browser: "safari", visitors: 200, fill: "var(--chart-2)" },
      { id: 3, browser: "firefox", visitors: 187, fill: "var(--chart-3)" },
      { id: 4, browser: "edge", visitors: 173, fill: "var(--chart-4)" },
      { id: 5, browser: "other", visitors: 90, fill: "var(--chart-5)" },
    ],
    [],
  );

  if (!result) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">No data available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Left column - Priority charts */}
      <div className="flex flex-col gap-5 lg:col-span-2">
        <Suspense fallback={<ChartSkeleton />}>
          <ReusableAreaChart
            title="Sales Overview"
            description="Sales trends over selected period"
            data={combinedChartData}
            config={salesChartConfig}
          />
        </Suspense>

        <Suspense fallback={<ChartSkeleton />}>
          <Charts topProducts={result.topProducts} formData={result.formData} />
        </Suspense>
      </div>

      {/* Right column - Secondary charts */}
      <div className="flex flex-col gap-6 lg:col-span-1">
        <Suspense fallback={<ChartSkeleton />}>
          <TopSellingChartWrapper
            data={result.revenue}
            formData={result.formData}
            title="Sales"
            width="w-full"
            widthco="w-full"
            dataKey="total"
            paramKey="revnue"
          />
        </Suspense>

        <Suspense
          fallback={
            <div className="h-[300px] animate-pulse rounded bg-gray-200" />
          }
        >
          <ChartPieLegend chartData={staticChartData} />
        </Suspense>
      </div>

      {/* Tables - Load last */}
      <div className="lg:col-span-3">
        <Suspense fallback={<TableSkeleton />}>
          <LazySection>
            <UserActivityTable
              Sales={result.recentSales}
              total={result.pagination.total}
              logs={result.activityLogs}
              totals={result.activityLogs.length}
              sort={result.sort}
            />
          </LazySection>
        </Suspense>
      </div>
    </div>
  );
}
