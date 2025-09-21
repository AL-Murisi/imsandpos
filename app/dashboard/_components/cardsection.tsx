import { Button } from "@/components/ui/button";
import { IconBox, IconCash, IconTruckDelivery } from "@tabler/icons-react";
import { DollarSign, Users } from "lucide-react";

import { ChartCard } from "@/components/common/ChartCard";
import Link from "next/link";

import DashboardHeader from "@/components/common/dashboradheader";

interface SectionCardsProps {
  salesSummary: any;
  productStats: any;

  loading: boolean;
  totalusers: number;
  charts: {
    salesChart: { date: string; value: number }[];
    purchasesChart: { date: string; value: number }[];
    revenueChart: { date: string; value: number }[];
    debtChart: { date: string; value: number }[];
  };
}

export function SectionCards({
  salesSummary,
  productStats,
  loading,

  totalusers,
  charts,
}: SectionCardsProps) {
  const chartConfigs: Record<
    string,
    { label: string; stroke: string; fill: string; dateFormat?: string }
  > = {
    revenue: {
      label: "الإيرادات",
      stroke: "#22c55e", // green line
      fill: "#16a34a", // green fill
      dateFormat: "MMM dd",
    },
    purchases: {
      label: "المشتريات",
      stroke: "#10b981", // teal line
      fill: "#059669", // teal fill
      dateFormat: "MMM dd",
    },
    sales: {
      label: "المبيعات",
      stroke: "#2563eb", // blue line
      fill: "#3b82f6", // blue fill
      dateFormat: "MMM dd",
    },
    debt: {
      label: "الديون",
      stroke: "#dc2626", // red line
      fill: "#b91c1c", // red fill
      dateFormat: "MMM dd",
    },
    ss: {
      label: "الديون",
      stroke: "#9333ea", // purple line
      fill: "#7e22ce", // purple fill
      dateFormat: "MMM dd",
    },
  };

  const sections = [
    {
      icon: <DollarSign size={40} className="text-blue-500" />,
      title: `${salesSummary.totalRevenu}:﷼,`,
      description: "revenue",
      label: "مبيعات ",
      link: "",
      chartData: charts.revenueChart,
      bg: "bg-gradient-to-r dark:from-blue-500 dark:to-indigo-700 from-chart-2 to-chart-3",
    },
    {
      icon: <IconCash size={40} className="text-green-600" />,
      title: ` ${salesSummary.totalPurchces?.toFixed(0)}﷼ `,
      description: "purchases",
      label: "الإيراد",
      link: "",
      chartData: charts.purchasesChart,
      bg: "bg-gradient-to-r dark:from-green-500 dark:to-emerald-700 from-chart-3 to-chart-4",
    },
    {
      icon: <IconTruckDelivery size={40} className="text-red-600" />,
      title: ` ${salesSummary.totalDebtAmount}:﷼`,
      description: "debt",
      label: "الديون المستحقة",
      link: "/sells/debtSell",
      chartData: charts.debtChart,
      bg: "bg-gradient-to-r dark:from-red-500 dark:to-orange-700 from-chart-4 to-chart-1",
    },
    {
      icon: <IconTruckDelivery size={40} className="text-red-600" />,
      title: `${salesSummary.recivedDebtAmount}:﷼`,
      description: "ss",
      label: "الديون المست",
      link: "/sells/debtSell",
      chartData: charts.debtChart,
      bg: "bg-gradient-to-r dark:from-pink-500 dark:to-rose-700 from-chart-1 to-chart-3",
    },
  ];

  const differentSection = [
    {
      icon: <IconBox size={40} className="text-cyan-600" />,
      title: productStats.totalStockQuantity,
      description: "منتج",
      label: "المخزون الكلي",
      link: "/inventory/manageinvetory",
      bg: "bg-gradient-to-r from-cyan-500 to-cyan-700",
    },
    {
      icon: <IconBox size={40} className="text-red-600" />,
      title: ` ${productStats.lowStockProducts}`,
      title2: ` ${productStats.zeroProducts}`,
      description: "dمنتج",
      label: "منتجات منخفضة",
      label2: "منتجات finsied",
      link: "/inventory/manageinvetory",
      bg: "bg-gradient-to-r from-red-500 to-red-700",
    },
    {
      icon: <Users size={40} className="text-red-600" />,
      title: totalusers,
      description: "users",
      label: " users",
      link: "/users",
      bg: "bg-gradient-to-r from-purple-500 to-purple-700",
    },
    {
      icon: <IconBox size={40} className="text-blue-500" />,
      title: ` ${salesSummary.transactionsToday}`,
      description: "sales",
      label: "مبيعات ",
      link: "",
      bg: "bg-gradient-to-r from-blue-500 to-blue-700",
    },
  ];

  return (
    <div className="flex flex-col items-center">
      {" "}
      <DashboardHeader sections={sections} chartConfigs={chartConfigs} />
      <div className="grid w-full grid-cols-1 gap-x-4 gap-y-5 p-2 sm:grid-cols-2 xl:grid-cols-4">
        {sections.map((item, idx) => (
          <ChartCard
            key={idx}
            bg={item.bg}
            icon={item.icon}
            title={item.title}
            label={item.label}
            description={item.description}
            link={item.link}
            loading={loading}
            chartData={item.chartData}
            chartConfig={chartConfigs[item.description]}
          />
        ))}

        {differentSection.map((item, idx) => (
          <ChartCard
            key={idx}
            icon={item.icon}
            bg={item.bg}
            title={item.title}
            title2={item.title2}
            label2={item.label2}
            label={item.label}
            description={item.description}
            link={item.link}
            loading={loading}
          />
        ))}
      </div>
      <div className="grid w-52 grid-cols-1 justify-end gap-x-4 gap-y-4 py-4 sm:w-sm sm:grid-cols-2 md:w-md md:grid-cols-4 lg:w-full lg:grid-cols-4">
        <Button aria-label="report" asChild>
          <Link href="/admin/reports" prefetch={false}>
            إنشاء التقارير
          </Link>
        </Button>
        <Button aria-label="report" asChild>
          <Link href="/dashboard/users" prefetch={false}>
            إدارة المستخدمين
          </Link>
        </Button>
        <Button aria-label="report" asChild>
          <Link href="/inventory" prefetch={false}>
            إدارة المخزون
          </Link>
        </Button>
        <Button aria-label="report" asChild>
          <Link href="/sells/debtSell" prefetch={false}>
            عرض الديون
          </Link>
        </Button>
      </div>
      {/*
    <Suspense>
      <ReusableAreaChart
        title="Sales Overview"
        description="Sales trends over selected period"
        data={result}
        config={salesChartConfig}
      />
    </Suspense> */}
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
