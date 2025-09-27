import { ChartCard } from "@/components/common/ChartCard";
import DashboardHeader from "@/components/common/dashboradheader";
import { IconBox, IconCash, IconTruckDelivery } from "@tabler/icons-react";
import { DollarSign, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

// Import your server actions
import {
  fetchSalesSummary,
  fetchProductStats,
  Fetchusers,
  FetchDebtSales,
  getTopSellingProducts,
  fetchrevnu,
} from "@/app/actions/sells";
import { ParsedSort } from "@/hooks/sort";
import { Prisma } from "@prisma/client";
import { getTranslations } from "next-intl/server";

interface SectionCardsProps {
  searchParams: Promise<{
    from?: string;
    to?: string;
    revnueDate?: string;
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
  }>;
}

export default async function SectionCards({
  searchParams,
  salesSummary,
}: any) {
  // Extract search params with defaults
  const params = await searchParams;

  const filters = {
    salesFrom: params?.salesFrom,
    salesTo: params?.salesTo,
    purchasesFrom: params?.purchasesFrom,
    purchasesTo: params?.purchasesTo,
    revenueFrom: params?.revenueFrom,
    revenueTo: params?.revenueTo,
    debtFrom: params?.debtFrom,
    debtTo: params?.debtTo,
    chartFrom: params?.chartFrom,
    chartTo: params?.chartTo,
    allFrom: params?.allFrom,
    allTo: params?.allTo,
    revnueDate: params?.revnueDate,
  };

  const debtFilter: Prisma.SaleWhereInput = {
    // Add your filter logic if needed
  };

  // Fetch all data in parallel
  const [productStats, users] = await Promise.all([
    // fetchSalesSummary("admin", filters),
    fetchProductStats("admin"),
    Fetchusers(true),
    // FetchDebtSales(debtFilter, query, from, to, pageIndex, limit, parsedSort),
    // getTopSellingProducts(Number(searchParams?.topItems || 5), from, to, categoryId),
    fetchrevnu(filters.allFrom, filters.allTo, params?.revnueDate),
  ]);

  // Combine chart data
  const t = await getTranslations("cards");
  const chartConfigs: Record<
    string,
    { label: string; stroke: string; fill: string; dateFormat?: string }
  > = {
    revenue: {
      label: t("revenue"),
      stroke: "#22c55e", // green line
      fill: "#16a34a", // green fill
      dateFormat: "MMM dd",
    },
    purchases: {
      label: t("purchases"),
      stroke: "#10b981", // teal line
      fill: "#059669", // teal fill
      dateFormat: "MMM dd",
    },
    sales: {
      label: t("sales"),
      stroke: "#2563eb", // blue line
      fill: "#3b82f6", // blue fill
      dateFormat: "MMM dd",
    },
    debt: {
      label: t("debt"),
      stroke: "#dc2626", // red line
      fill: "#b91c1c", // red fill
      dateFormat: "MMM dd",
    },
    ss: {
      label: t("debt"),
      stroke: "#9333ea", // purple line
      fill: "#7e22ce", // purple fill
      dateFormat: "MMM dd",
    },
  };

  const sections = [
    {
      icon: <DollarSign size={40} className="text-blue-500" />,
      title: `${salesSummary.revenue.total}:﷼,`,
      description: "revenue",
      label: t("sales"),
      link: "",
      chartData: salesSummary.revenue.chart,
      bg: "bg-gradient-to-r dark:from-blue-500 dark:to-indigo-700 from-chart-2 to-chart-3",
    },
    {
      icon: <IconCash size={40} className="text-green-600" />,
      title: ` ${salesSummary.purchases.total?.toFixed(0)}﷼ `,
      description: "purchases",
      label: t("purchases"),
      link: "",
      chartData: salesSummary.purchases.chart,
      bg: "bg-gradient-to-r dark:from-green-500 dark:to-emerald-700 from-chart-3 to-chart-4",
    },
    {
      icon: <IconTruckDelivery size={40} className="text-red-600" />,
      title: ` ${salesSummary.debt.totalDebt}:﷼`,
      description: "debt",
      label: t("debt"),
      link: "/sells/debtSell",
      chartData: salesSummary.debt.chart,
      bg: "bg-gradient-to-r dark:from-red-500 dark:to-orange-700 from-chart-4 to-chart-1",
    },
    {
      icon: <IconTruckDelivery size={40} className="text-red-600" />,
      title: `${salesSummary.debt.received}:﷼`,
      description: "ss",
      label: t("receivedDebt"),
      link: "/sells/debtSell",
      chartData: salesSummary.debt.chart,
      bg: "bg-gradient-to-r dark:from-pink-500 dark:to-rose-700 from-chart-1 to-chart-3",
    },
  ];

  const differentSection = [
    {
      icon: <IconBox size={40} className="text-cyan-600" />,
      title: productStats.totalStockQuantity,
      description: "product",
      label: t("totalStock"),
      link: "/inventory/manageinvetory",
      bg: "bg-gradient-to-r from-cyan-500 to-cyan-700",
    },
    {
      icon: <IconBox size={40} className="text-red-600" />,
      title: ` ${productStats.lowStockProducts}`,
      title2: ` ${productStats.zeroProducts}`,
      description: "product",
      label: t("lowStock"),
      label2: t("finishedStock"),
      link: "/inventory/manageinvetory",
      bg: "bg-gradient-to-r from-red-500 to-red-700",
    },
    {
      icon: <Users size={40} className="text-red-600" />,
      title: users.users,
      description: "users",
      label: t("users"),
      link: "/users",
      bg: "bg-gradient-to-r from-purple-500 to-purple-700",
    },
    {
      icon: <IconBox size={40} className="text-blue-500" />,
      title: ` ${salesSummary.sales.total}`,
      description: "sales",
      label: t("sales"),
      link: "",
      bg: "bg-gradient-to-r from-blue-500 to-blue-700",
    },
  ];

  return (
    <>
      <DashboardHeader sections={sections} chartConfigs={chartConfigs} />
      <div className="flex flex-col items-center">
        <div className="grid w-full grid-cols-1 gap-6 p-2 sm:grid-cols-2 xl:grid-cols-4">
          {sections.map((item, idx) => (
            <ChartCard
              key={idx}
              bg={item.bg}
              icon={item.icon}
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
              key={idx}
              icon={item.icon}
              bg={item.bg}
              title={item.title ?? 2}
              title2={item.title2}
              label2={item.label2}
              label={item.label}
              description={item.description}
              link={item.link}
              loading={false}
            />
          ))}
        </div>
        <div className="grid w-80 grid-cols-2 justify-end gap-x-4 gap-y-4 py-4 sm:w-sm sm:grid-cols-2 md:w-md md:grid-cols-4 lg:w-full lg:grid-cols-4"> <Button aria-label="report" asChild> <Link href="/admin/reports" prefetch={false}> إنشاء التقارير </Link> </Button> <Button aria-label="report" asChild> <Link href="/dashboard/users" prefetch={false}> إدارة المستخدمين </Link> </Button> <Button aria-label="report" asChild> <Link href="/inventory" prefetch={false}> إدارة المخزون </Link> </Button> <Button aria-label="report" asChild> <Link href="/sells/debtSell" prefetch={false}> عرض الديون </Link> </Button> </div>
      </div>
    </>
  );
}
