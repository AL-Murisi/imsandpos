"use client";
// import { ReusableAreaChart } from "@/components/common/Chart";
import { useMemo, lazy, Suspense } from "react";
import Charts from "./overview";
// import TopSellingChartWrapper from "@/components/common/Barchart";
// import { ChartPieLegend } from "@/components/common/PieChart";
import { LazySection } from "@/components/common/LazySection";
import UserActivityTable from "./userActivityTable";
import dynamic from "next/dynamic";
import React from "react";
import { useTranslations } from "next-intl";
// Lazy load heavy chart components
const ChartPieLegend = dynamic(
  () => import("@/components/common/PieChart").then((m) => m.ChartPieLegend),
  {
    ssr: false,
  },
);
const TopSellingChartWrapper = dynamic(
  () => import("@/components/common/Barchart"),
  {
    ssr: false,
    loading: () => (
      <div className="col-span-1 h-[50vh] animate-pulse rounded-lg bg-gray-200" />
    ),
  },
);
const ReusableAreaChart = dynamic(
  () => import("@/components/common/Chart").then((m) => m.ReusableAreaChart),
  {
    ssr: false,
    loading: () => (
      <div className="col-span-2 h-[50vh] animate-pulse rounded-lg bg-gray-200" />
    ),
  },
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
  result: {
    topProducts: Array<{ name: string; quantity: number }>;
    recentSales: any[];
    activityLogs: any[];
    revenue: Array<{ date: string; value: number }>; // This should match your revenue chart data
    pagination: { page: number; limit: number; total: number };
    sort: any[];
    formData?: any; // Make optional since it might not be needed
  };
  salesSummary: {
    sales: { total: number; chart: Array<{ date: string; value: number }> };
    purchases: { total: number; chart: Array<{ date: string; value: number }> };
    revenue: { total: number; chart: Array<{ date: string; value: number }> };
    debt: {
      unreceived: number;
      received: number;
      unreceivedChart: Array<{ date: string; value: number }>;
      receivedChart: Array<{ date: string; value: number }>;
    };
    expenseBreakdown: any;
  };
}

function DashboardContentClient({
  result,
  salesSummary,
}: DashboardContentClientProps) {
  const revMap = new Map(
    salesSummary.revenue.chart.map((pt) => [pt.date, pt.value.toFixed(2)]),
  );
  const purMap = new Map(
    salesSummary.purchases.chart.map((pt) => [pt.date, pt.value.toFixed(2)]),
  );

  const allDates = Array.from(
    new Set([...revMap.keys(), ...purMap.keys()]),
  ).sort();

  const combined = allDates.map((date) => ({
    date,
    revenue: revMap.get(date) ?? 0,
    purchases: purMap.get(date) ?? 0,
  }));
  const t = useTranslations("cards");

  const salesChartConfig = useMemo(
    () => ({
      revenue: { label: t("revenue"), color: "#dc2626" },
      purchases: { label: t("purchases"), color: "#3b82f6" },
    }),
    [t],
  );
  const chartConfigs: Record<
    string,
    { label: string; stroke: string; fill: string; dateFormat?: string }
  > = {
    revenue: {
      label: t("revenue"),
      stroke: "#22c55e",
      fill: "#16a34a",
      dateFormat: "MMM dd",
    },
    purchases: {
      label: t("purchases"),
      stroke: "#10b981",
      fill: "#059669",
      dateFormat: "MMM dd",
    },
  };

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

  // Transform revenue data for the TopSellingChartWrapper
  const revenueChartData = useMemo(() => {
    return salesSummary.revenue.chart.map((item, index) => ({
      date: item.date,
      total: item.value, // Map 'value' to 'total' expected by the chart
      key: item.date,
    }));
  }, [salesSummary.revenue.chart]);

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
        <ReusableAreaChart
          title="نظرة عامة على المبيعات"
          description="اتجاهات المبيعات خلال الفترة المحددة"
          data={combined}
          config={salesChartConfig}
          t={t}
        />

        <Charts topProducts={result.topProducts} formData={result.formData} />
      </div>

      <div className="flex flex-col gap-6 lg:col-span-1">
        <TopSellingChartWrapper
          data={revenueChartData} // Use transformed revenue data
          color="var(--chart-5)"
          title={t("revenue")}
          width="w-full"
          widthco="w-full"
          dataKey="total"
          paramKey="revenue"
        />

        <ChartPieLegend chartData={salesSummary.expenseBreakdown} />
      </div>

      {/*
      <div className="lg:col-span-3">
        <Suspense fallback={<TableSkeleton />}>
          <LazySection>
            <UserActivityTable
              Sales={result.recentSales}
              total={result.pagination?.total || 0}
              logs={result.activityLogs || []}
              totals={result.activityLogs?.length || 0}
              sort={result.sort || []}
            />
          </LazySection>
        </Suspense>
      </div> */}
    </div>
  );
}
export default React.memo(DashboardContentClient);
