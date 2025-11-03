"use client";
// import { ChartCard } from "@/components/common/ChartCard";
import DashboardHeader from "@/components/common/dashboradheader";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const ExportDashboardButtonAPI = dynamic(
  () =>
    import("@/components/ExportDashboardButton").then(
      (m) => m.ExportDashboardButtonAPI,
    ),
  {
    ssr: false,
  },
);
// ✅ Individual icon imports (saves ~180KB)
import DollarSign from "lucide-react/dist/esm/icons/dollar-sign";
import ShoppingCart from "lucide-react/dist/esm/icons/shopping-cart";
import HandCoins from "lucide-react/dist/esm/icons/hand-coins";
import Banknote from "lucide-react/dist/esm/icons/banknote";
import Boxes from "lucide-react/dist/esm/icons/boxes";
import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle";
import Users from "lucide-react/dist/esm/icons/users";
import ShoppingBag from "lucide-react/dist/esm/icons/shopping-bag";
import { ReactNode } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { ChartCard } from "@/components/common/ChartCard";

interface SectionCardsProps {
  searchParams: Record<string, string | undefined>;
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
    netProfit: any;
  };
  productStats: {
    totalStockQuantity: number;
    lowStockProducts: number;
    zeroProducts: number;
  };
  users: { users: number };
}

export default function SectionCards({
  searchParams,
  salesSummary,
  productStats,
  users,
}: SectionCardsProps) {
  const t = useTranslations("cards");

  // Icon map - using individual imports (saves ~180KB!)
  const iconMap: Record<string, ReactNode> = {
    revenue: <DollarSign size={40} className="text-blue-500" />,
    purchases: <ShoppingCart size={40} className="text-green-600" />,
    debt: <HandCoins size={40} className="text-red-600" />,
    receivedDebt: <Banknote size={40} className="text-green-600" />,
    product: <Boxes size={40} className="text-cyan-600" />,
    lowStock: <AlertTriangle size={40} className="text-red-600" />,
    users: <Users size={40} className="text-purple-600" />,
    sales: <ShoppingBag size={40} className="text-blue-500" />,
  };

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
    sales: {
      label: t("sales"),
      stroke: "#2563eb",
      fill: "#3b82f6",
      dateFormat: "MMM dd",
    },
    debt: {
      label: t("debt"),
      stroke: "#dc2626",
      fill: "#b91c1c",
      dateFormat: "MMM dd",
    },
    receivedDebt: {
      label: t("receivedDebt"),
      stroke: "#9333ea",
      fill: "#7e22ce",
      dateFormat: "MMM dd",
    },
  };

  const sections = [
    {
      description: "revenue",
      title: `${salesSummary.revenue.total} `,
      label: t("revenue"),
      link: "",
      chartData: salesSummary.revenue.chart,
      bg: "bg-gradient-to-r dark:from-blue-500 dark:to-indigo-700 from-chart-2 to-chart-3",
    },
    {
      description: "purchases",
      title: `${salesSummary.purchases.total?.toFixed(0)} `,
      label: t("purchases"),
      link: "",
      chartData: salesSummary.purchases.chart,
      bg: "bg-gradient-to-r dark:from-green-500 dark:to-emerald-700 from-chart-3 to-chart-4",
    },
    {
      description: "debt",
      title: `${salesSummary.debt.unreceived} `,
      label: t("debt"),
      link: "/debt",
      chartData: salesSummary.debt.unreceivedChart,
      bg: "bg-gradient-to-r dark:from-red-500 dark:to-orange-700 from-chart-4 to-chart-1",
    },
    {
      description: "receivedDebt",
      title: `${salesSummary.netProfit} `,
      label: t("receivedDebt"),
      link: "/debt",
      chartData: salesSummary.sales.chart,
      bg: "bg-gradient-to-r dark:from-pink-500 dark:to-rose-700 from-chart-1 to-chart-3",
    },
  ];

  const differentSection = [
    {
      description: "product",
      title: productStats.totalStockQuantity,
      label: t("totalStock"),
      link: "/inventory/manageinvetory",
      bg: "bg-gradient-to-r from-cyan-500 to-cyan-700",
    },
    {
      description: "lowStock",
      title: productStats.lowStockProducts,
      title2: productStats.zeroProducts,
      label: t("lowStock"),
      label2: t("finishedStock"),
      link: "/inventory/manageinvetory",
      bg: "bg-gradient-to-r from-red-500 to-red-700",
    },
    {
      description: "users",
      title: users.users,
      label: t("users"),
      link: "/users",
      bg: "bg-gradient-to-r from-purple-500 to-purple-700",
    },
    {
      description: "sales",
      title: salesSummary.sales.total,
      label: t("sales"),
      link: "",
      bg: "bg-gradient-to-r from-blue-500 to-blue-700",
    },
  ];

  return (
    <>
      <DashboardHeader sections={sections} chartConfigs={chartConfigs} />

      <div className="flex flex-col items-center group-has-[[data-pending]]:animate-pulse">
        <div className="grid w-full grid-cols-1 gap-6 p-2 sm:grid-cols-2 xl:grid-cols-4">
          {sections.map((item, idx) => (
            <ChartCard
              key={`section-${idx}`}
              bg={item.bg}
              icon={iconMap[item.description]}
              title={item.title}
              label={item.label}
              description={item.description}
              link={item.link}
              loading={false}
              chartData={item.chartData}
              chartConfig={chartConfigs[item.description]}
            />
          ))}

          {differentSection.map((item, idx) => (
            <ChartCard
              key={`diff-${idx}`}
              bg={item.bg}
              icon={iconMap[item.description]}
              title={item.title}
              title2={item.title2}
              label={item.label}
              label2={item.label2}
              description={item.description}
              link={item.link}
              loading={false}
            />
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid w-80 grid-cols-2 gap-4 py-4 sm:w-sm md:w-md md:grid-cols-4 lg:w-full">
          <ExportDashboardButtonAPI role={"admin"} filters={searchParams} />
          <Button asChild>
            <Link href="/users" prefetch={false}>
              إدارة المستخدمين
            </Link>
          </Button>
          <Button asChild>
            <Link href="/inventory/manageinvetory" prefetch={false}>
              إدارة المخزون
            </Link>
          </Button>
          <Button asChild>
            <Link href="/debt" prefetch={false}>
              عرض الديون
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}
