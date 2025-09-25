import { verifySession } from "@/lib/dal";
// import { redirect } from "next/navigation";
// import { ScrollArea } from "@/components/ui/scroll-area";
// import ClientDashboardContent from "./_components/test";
import { fetchSalesSummary } from "@/app/actions/sells";

import dynamic from "next/dynamic";
import SectionCards from "./_components/cardsection";
// import { DashboardSkeleton } from "@/components/DashboardSkeleton";
const DashboardContent = dynamic(
  () => import("./_components/DashboardContent"),
  {},
);
interface DashboardContentProps {
  searchParams: Promise<{
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
  }>;
}
const ScrollArea = dynamic(
  () => import("@/components/ui/scroll-area").then((m) => m.ScrollArea),
  {
    // ensures it only loads on the client
    // optional fallback
  },
);
export default async function Dashboard({
  searchParams,
}: DashboardContentProps) {
  const session = await verifySession();
  // const [
  //   salesSummary,
  //   productStats,
  //   users,
  //   recentSales,
  //   topProducts,
  //   activityLogs,
  //   formData,
  //   revenue,
  // ] = await Promise.all([
  //   fetchSalesSummary("admin", filters),
  //   fetchProductStats("admin"),
  //   Fetchusers(true),
  //   FetchDebtSales(filter, query, from, to, pageIndex, pageSize, parsedSort),
  //   getTopSellingProducts(Number(topItems), from, to, categoryId),
  //   getActivityLogs(pageIndex, pageSize, parsedSort),
  //   fetchAllFormData(),
  //   fetchrevnu(allFrom, allTo, revnue),
  // ]);
  const params = await searchParams;
  // Build query string from searchParams
  const queryParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === "string") {
      queryParams.append(key, value);
    }
  });
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    `http://localhost:${process.env.PORT ?? 3000}`;
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
  };

  const url = `${baseUrl}/api/salesSummary${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  const salesSummary = await fetchSalesSummary("admin", filters);
  const response = await fetch(url, {
    cache: "no-cache",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to fetch dashboard data");
  }

  const result = await response.json();

  return (
    <ScrollArea className="max-h-[95vh] p-2" dir="rtl">
      <SectionCards searchParams={params} salesSummary={salesSummary} />
      <DashboardContent result={result} salesSummary={salesSummary} />{" "}
    </ScrollArea>
  );
}
