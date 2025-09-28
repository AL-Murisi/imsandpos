// import { verifySession } from "@/lib/dal";
// import { fetchSalesSummary } from "@/app/actions/sells";
// import dynamic from "next/dynamic";
// import { Suspense } from "react";

// // Lazy load components with optimized loading states
// const SectionCards = dynamic(() => import("./_components/cardsection"), {
//   loading: () => <div className="h-48 animate-pulse rounded-lg bg-gray-200" />,
// });

// const DashboardContent = dynamic(
//   () => import("./_components/DashboardContent"),
//   {
//     loading: () => (
//       <div className="h-96 animate-pulse rounded-lg bg-gray-200" />
//     ),
//   },
// );

// const ScrollArea = dynamic(() =>
//   import("@/components/ui/scroll-area").then((m) => m.ScrollArea),
// );

// interface DashboardContentProps {
//   searchParams: Promise<{
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
//   }>;
// }

// // Helper to build query string efficiently
// function buildQueryString(params: Record<string, string | undefined>): string {
//   const entries = Object.entries(params).filter(
//     ([_, value]) => value !== undefined && value !== "",
//   );

//   if (entries.length === 0) return "";

//   return (
//     "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join("&")
//   );
// }

// // Extract filters from params
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
//     chartFrom: params.chartFrom,
//     chartTo: params.chartTo,
//     allFrom: params.allFrom,
//     allTo: params.allTo,
//   };
// }

// export default async function Dashboard({
//   searchParams,
// }: DashboardContentProps) {
//   // Verify session first (early return if unauthorized)
//   const session = await verifySession();

//   const params = await searchParams;
//   const filters = extractFilters(params);

//   // Build API URL
//   const baseUrl =
//     process.env.NEXT_PUBLIC_BASE_URL ||
//     `http://localhost:${process.env.PORT ?? 3000}`;
//   const queryString = buildQueryString(params);
//   const apiUrl = `${baseUrl}/api/salesSummary${queryString}`;

//   // Parallel data fetching - CRITICAL OPTIMIZATION
//   const [salesSummary, apiResult] = await Promise.all([
//     fetchSalesSummary("admin", filters),
//     fetch(apiUrl, {
//       next: { revalidate: 60 }, // Cache for 60s instead of no-cache
//       headers: { "Content-Type": "application/json" },
//     }).then(async (res) => {
//       if (!res.ok) {
//         const errorData = await res.json().catch(() => ({}));
//         throw new Error(errorData.error || "Failed to fetch dashboard data");
//       }
//       return res.json();
//     }),
//   ]);

//   return (
//     <ScrollArea className="max-h-[95vh] p-2" dir="rtl">
//       <Suspense
//         fallback={<div className="h-48 animate-pulse rounded-lg bg-gray-200" />}
//       >
//         <SectionCards searchParams={params} salesSummary={salesSummary} />
//       </Suspense>

//       <Suspense
//         fallback={<div className="h-96 animate-pulse rounded-lg bg-gray-200" />}
//       >
//         <DashboardContent result={apiResult} salesSummary={salesSummary} />
//       </Suspense>
//     </ScrollArea>
//   );
// }
// app/dashboard/page.tsx - SERVER COMPONENT (keep as is)
import { verifySession } from "@/lib/dal";
import { fetchSalesSummary } from "@/app/actions/sells";
import SectionCards from "./_components/cardsection";
import { ScrollArea } from "@/components/ui/scroll-area";
import DashboardContent from "./_components/DashboardContent";

interface DashboardContentProps {
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
    chartFrom: params.chartFrom,
    chartTo: params.chartTo,
    allFrom: params.allFrom,
    allTo: params.allTo,
  };
}

function buildQueryString(params: Record<string, string | undefined>): string {
  const filtered = Object.entries(params).filter(
    ([_, v]) => v !== undefined && v !== "",
  );

  return filtered.length
    ? "?" + filtered.map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join("&")
    : "";
}

export default async function Dashboard({
  searchParams,
}: DashboardContentProps) {
  const session = await verifySession();
  const params = await searchParams;
  const filters = extractFilters(params);

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    `http://localhost:${process.env.PORT ?? 3000}`;
  const queryString = buildQueryString(params);
  const apiUrl = `${baseUrl}/api/salesSummary${queryString}`;

  // Fetch data in parallel on the server
  const [salesSummary, apiResult] = await Promise.allSettled([
    fetchSalesSummary("admin", filters),
    fetch(apiUrl, {
      next: { revalidate: 60 },
      headers: { "Content-Type": "application/json" },
    }).then(async (res) => {
      if (!res.ok) {
        const error = await res
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(error.error || "Failed to fetch dashboard data");
      }
      return res.json();
    }),
  ]);

  const salesData =
    salesSummary.status === "fulfilled" ? salesSummary.value : null;
  const resultData = apiResult.status === "fulfilled" ? apiResult.value : null;

  if (!salesData || !resultData) {
    return (
      <div className="p-8 text-center">
        <h2 className="mb-2 text-xl font-bold">Unable to load dashboard</h2>
        <p className="text-gray-600">
          {salesSummary.status === "rejected" && salesSummary.reason?.message}
        </p>
      </div>
    );
  }

  // Pass data to client component
  return (
    <ScrollArea className="max-h-[95vh] p-2" dir="rtl">
      <SectionCards searchParams={params} salesSummary={salesData} />
      <DashboardContent result={resultData} salesSummary={salesData} />
    </ScrollArea>
  );
}
