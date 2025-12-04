// import { fetchDashboardData } from "@/lib/actions/dashboard";
// import { ScrollArea } from "@/components/ui/scroll-area";
// import { revalidateTag } from "next/cache";
// import SectionCards from "./_components/cardsection";
// import DashboardContentClient from "./_components/DashboardContent";
// import { verifySession } from "@/lib/dal";
// import { redirect } from "next/navigation";
// import { fetchAllFormData } from "@/lib/actions/roles";

// import { getSession } from "@/lib/session";

// interface DashboardProps {
//   searchParams: Promise<Record<string, string | undefined>>;
// }

// function extractFilters(params: Record<string, string | undefined>) {
//   return {
//     salesFrom: params.salesFrom,
//     salesTo: params.salesTo,
//     purchasesFrom: params.purchasesFrom,
//     purchasesTo: params.purchasesTo,
//     revenueFrom: params.revenueFrom,
//     revenueTo: params.revenueTo,
//     debtFrom: params.debtFrom,
//     debtTo: params.debtTo,
//     allFrom: params.allFrom,
//     allTo: params.allTo,

//     revenue: params.revenue,
//   };
// }

// export default async function Dashboard({ searchParams }: DashboardProps) {
//   // Verify session first
//   const session = verifySession();
//   if (!session) {
//     redirect("/login");
//   }
//   const params = await searchParams;
//   const filters = extractFilters(params);
//   const topItems = Number(params.topItems || "4");
//   const revenue = Number(params.revenue || "5");
//   const user = await getSession();
//   if (!user) return;
//   const pagination = {
//     page: Number(params.page || "1") - 1,
//     pageSize: Number(params.limit || "5"),
//     query: params.query || "",
//     sort: params.sort || "",
//   };

//   try {
//     // 🚀 SINGLE FUNCTION CALL - replaces 10+ separate database queries
//     const dashboardData = await fetchDashboardData(
//       user.companyId,
//       "admin", // TODO: Get from session
//       filters,
//       topItems,
//       revenue,
//       pagination,
//     );
//     const formateddate = await fetchAllFormData(user.companyId);
//     // Split data for components
//     const salesSummary = {
//       sales: dashboardData.sales,
//       purchases: dashboardData.purchases,
//       revenue: dashboardData.revenue,
//       debt: dashboardData.debt,
//     };

//     const componentData = {
//       topProducts: dashboardData.topProducts,
//       recentSales: dashboardData.recentSales,
//       activityLogs: dashboardData.activityLogs,
//       revenue: dashboardData.revenue.chart, // Pass the chart data
//       pagination: {
//         page: pagination.page + 1,
//         limit: pagination.pageSize,
//         total: dashboardData.recentSales.length,
//       },
//       sort: [],
//       formData:
//         // Mock data for now - add real data later if needed
//         formateddate,
//     };

//     return (
//       <ScrollArea className="max-h-[95vh] p-2" dir="rtl">
//         <SectionCards
//           searchParams={filters}
//           salesSummary={salesSummary}
//           productStats={dashboardData.productStats}
//           users={dashboardData.users}
//         />
//         <DashboardContentClient
//           result={componentData}
//           salesSummary={salesSummary}
//         />
//       </ScrollArea>
//     );
//   } catch (error) {
//     console.error("Dashboard Error:", error);
//     return (
//       <div className="p-8 text-center">
//         <h2 className="mb-2 text-xl font-bold">Unable to load dashboard</h2>
//         <p className="text-gray-600">
//           {error instanceof Error ? error.message : "Unknown error occurred"}
//         </p>
//         <button
//           onClick={() => revalidateTag("dashboard")}
//           className="mt-4 rounded bg-blue-500 px-4 py-2 text-white"
//         >
//           Retry
//         </button>
//       </div>
//     );
//   }
// }

// // Add this to enable ISR (Incremental Static Regeneration)
// export const revalidate = 300; // Revalidate every 5 minutes
// app/dashboard/page.tsx
// app/dashboard/page.tsx
import { ScrollArea } from "@/components/ui/scroll-area";
import SectionCards from "./_components/cardsection";
import DashboardContentClient from "./_components/DashboardContent";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import {
  getDashboardData,
  getSummaryCards,
  getProductStats,
  getUserCount,
} from "@/lib/actions/dashboard";
import { fetchAllFormData } from "@/lib/actions/roles";
import prisma from "@/lib/prisma";

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
    revenue: params.revenue,
  };
}

export default async function Dashboard({ searchParams }: DashboardProps) {
  // Get authenticated user
  const user = await getSession();
  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const filters = extractFilters(params);
  const topItems = Number(params.topItems || "10");

  // Parse date range from filters or use defaults
  const endDate = params.allTo ? new Date(params.allTo) : new Date();

  const startDate = params.allFrom
    ? new Date(params.allFrom)
    : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days

  const pagination = {
    page: Number(params.page || "1") - 1,
    pageSize: Number(params.limit || "5"),
    query: params.query || "",
    sort: params.sort || "",
  };
  try {
    // 🚀 PARALLEL DATA FETCHING - All queries run simultaneously
    const [dashboardData, summaryCards, productStats, users, formData] =
      await Promise.all([
        getDashboardData(user.companyId, { startDate, endDate }, topItems),
        getSummaryCards(user.companyId, { startDate, endDate }),
        getProductStats(user.companyId),
        getUserCount(user.companyId),
        fetchAllFormData(user.companyId),
      ]);

    // Transform data for SectionCards component
    const salesSummary = {
      saleTotal: dashboardData.sales,

      sales: {
        total: summaryCards.revenue.total,
        chart: dashboardData.salesOverview.data.map((d) => ({
          date: d.date,
          value: d.revenue,
        })),
      },

      purchases: {
        total: summaryCards.purchases.total,
        chart: dashboardData.salesOverview.data.map((d) => ({
          date: d.date,
          value: d.purchases,
        })),
      },

      revenue: {
        total: summaryCards.revenue.total,
        chart: dashboardData.revenueChart.map((d) => ({
          date: d.date,
          value: d.total,
        })),
      },

      debt: {
        unreceived: summaryCards.debt.unreceived,
        received: 0, // TODO: add logic later
        unreceivedChart: dashboardData.salesOverview.data.map((d) => ({
          date: d.date,
          value: d.debts,
        })),
        receivedChart: [],
      },

      // ✅ ADD PROFIT HERE
      profit: {
        total: summaryCards.netProfit, // total profit for card
        chart: dashboardData.salesOverview.data.map((d) => ({
          date: d.date,
          value: d.profit, // daily profit from getSalesOverview
        })),
      },

      netProfit: summaryCards.netProfit, // keep if used elsewhere

      expenseBreakdown: dashboardData.expenseBreakdown,
    };

    // Transform data for DashboardContentClient
    const componentData = {
      topProducts: dashboardData.topProducts,
      recentSales: [], // TODO: Add your recent sales query
      activityLogs: [], // TODO: Add your activity logs query
      revenue: dashboardData.salesOverview.data.map((d) => ({
        date: d.date,
        value: d.revenue,
      })),
      pagination: {
        page: pagination.page + 1,
        limit: pagination.pageSize,
        total: 0, // TODO: Get actual total from recentSales
      },
      sort: [],
      formData: formData,
    };

    return (
      <ScrollArea className="max-h-[95vh] p-2" dir="rtl">
        <SectionCards
          searchParams={filters}
          salesSummary={salesSummary}
          productStats={productStats}
          users={users}
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
      </div>
    );
  }
}

// Enable ISR (Incremental Static Regeneration)
export const revalidate = 300; // Revalidate every 5 minutes
