import { Suspense } from "react";
import { verifySession } from "@/lib/dal";
import { redirect } from "next/navigation";
import DashboardContent from "./_components/DashboardContent";
// import { ScrollArea } from "@/components/ui/scroll-area";
import ClientDashboardContent from "./_components/test";
import dynamic from "next/dynamic";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";

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

  const url = `${baseUrl}/api/salesSummary${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

  const response = await fetch(url, {
    cache: "no-cache",
    headers: { "Content-Type": "application/json" },
  });

  // const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  // const response = await fetch(`/api/salesSummary?${queryParams.toString()}`, {
  //   // ❌ remove "no-store" unless you *really* want no caching
  //   cache: "no-store",

  // });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to fetch dashboard data");
  }

  const result = await response.json();

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <ClientDashboardContent result={result} />
    </Suspense>
  );
}
