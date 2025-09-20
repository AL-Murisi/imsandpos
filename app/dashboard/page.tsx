import { Suspense } from "react";
import { verifySession } from "@/lib/dal";
import { redirect } from "next/navigation";
import DashboardContent from "./_components/DashboardContent";
// import { ScrollArea } from "@/components/ui/scroll-area";
import ClientDashboardContent from "./_components/test";
import dynamic from "next/dynamic";

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
  const userRoles = session.userRole as string[];

  if (!userRoles.includes("admin")) redirect("/");
  if (!session.isAuth) redirect("/login");
  const params = await searchParams;
  // Build query string from searchParams
  const queryParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === "string") {
      queryParams.append(key, value);
    }
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  const response = await fetch(`/api/salesSummary?${queryParams.toString()}`, {
    // ❌ remove "no-store" unless you *really* want no caching
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to fetch dashboard data");
  }

  const result = await response.json();

  return (
    <ScrollArea className="h-[100vh] rounded-md p-2" dir="rtl">
      <div className="flex flex-col">
        {/* <Suspense fallback={<DashboardSkeleton />}> */}
        <ClientDashboardContent result={result} />
        {/* </Suspense> */}
      </div>
    </ScrollArea>
  );
}
