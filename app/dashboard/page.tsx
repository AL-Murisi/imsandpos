import { fetchDashboardData } from "@/app/actions/dashboard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { revalidateTag } from "next/cache";
import SectionCards from "./_components/cardsection";
import DashboardContentClient from "./_components/DashboardContent";
import { verifySession } from "@/lib/dal";
import { redirect } from "next/navigation";

interface DashboardProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

function extractFilters(params: Record<string, string | undefined>) {
  return {
    salesFrom: params.salesFrom,
    salesTo: params.salesTo,
    purchasesFrom: params.purchasesFrom,
    purchasesTo: params.purchasesTo,
    revenueFrom: params.revenueFrom,
    revenueTo: params.revenueTo,
    debtFrom: params.debtFrom,
    debtTo: params.debtTo,
    allFrom: params.allFrom,
    allTo: params.allTo,
  };
}

export default async function Dashboard({ searchParams }: DashboardProps) {
  // Verify session first
  const session = verifySession();
  if (!session) {
    redirect("/login");
  }
  const params = await searchParams;
  const filters = extractFilters(params);

  // Pagination for tables
  const pagination = {
    page: Number(params.page || "1") - 1,
    pageSize: Number(params.limit || "5"),
    query: params.query || "",
    sort: params.sort || "",
  };

  try {
    console.time("start");
    // 🚀 SINGLE FUNCTION CALL - replaces 10+ separate database queries
    const dashboardData = await fetchDashboardData(
      "admin", // TODO: Get from session
      filters,
      pagination,
    );

    // Split data for components
    const salesSummary = {
      sales: dashboardData.sales,
      purchases: dashboardData.purchases,
      revenue: dashboardData.revenue,
      debt: dashboardData.debt,
    };

    const componentData = {
      topProducts: dashboardData.topProducts,
      recentSales: dashboardData.recentSales,
      activityLogs: dashboardData.activityLogs,
      revenue: dashboardData.revenue.chart, // Pass the chart data
      pagination: {
        page: pagination.page + 1,
        limit: pagination.pageSize,
        total: dashboardData.recentSales.length,
      },
      sort: [],
      formData: {
        // Mock data for now - add real data later if needed
        warehouses: [],
        categories: [],
        brands: [],
        suppliers: [],
      },
    };
    console.timeEnd("start");
    return (
      <ScrollArea className="max-h-[95vh] p-2" dir="rtl">
        <SectionCards
          searchParams={filters}
          salesSummary={salesSummary}
          productStats={dashboardData.productStats}
          users={dashboardData.users}
        />
        <DashboardContentClient
          result={componentData}
          salesSummary={salesSummary}
        />
      </ScrollArea>
    );
  } catch (error) {
    console.error("Dashboard Error:", error);
    return (
      <div className="p-8 text-center">
        <h2 className="mb-2 text-xl font-bold">Unable to load dashboard</h2>
        <p className="text-gray-600">
          {error instanceof Error ? error.message : "Unknown error occurred"}
        </p>
        <button
          onClick={() => revalidateTag("dashboard")}
          className="mt-4 rounded bg-blue-500 px-4 py-2 text-white"
        >
          Retry
        </button>
      </div>
    );
  }
}

// Add this to enable ISR (Incremental Static Regeneration)
export const revalidate = 300; // Revalidate every 5 minutes
