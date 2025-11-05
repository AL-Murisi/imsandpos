import { FetchDebtSales, fetchSalesSummary } from "@/app/actions/sells";
import { verifySession } from "@/lib/dal";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import SellsDashboardClient from "./_components/sellsDasboard";
import { SortingState } from "@tanstack/react-table";
import { ParsedSort } from "@/hooks/sort";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getSession } from "@/lib/session";
import { fetchProductStats } from "../actions/Product";

type DashboardProps = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    categoryId?: string;
    tab?: string;
    usersquery?: string;
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
    sort: string;
  }>;
};

export default async function SellsDashboard({ searchParams }: DashboardProps) {
  const param = await searchParams;
  const {
    from,
    to,
    usersquery = "",
    page = "1",
    limit = "5",
    salesFrom,
    salesTo,
    purchasesFrom,
    purchasesTo,
    revenueFrom,
    revenueTo,
    debtFrom,
    debtTo,
    chartTo,
    chartFrom,
    allFrom,
    sort,
    allTo,
  } = param;

  const pageIndex = Number(page) - 1;
  const pageSize = Number(limit);
  const parsedSort: SortingState = ParsedSort(sort);
  const user = await getSession();
  if (!user) return;
  // 🧩 Verify session and extract role
  const { userId, userRole } = await verifySession();
  const role = userRole?.includes("admin") ? "admin" : "cashier";

  // 🧩 Filter: if cashier → limit to his own sales
  const filter: Prisma.SaleWhereInput =
    role === "cashier"
      ? ({ cashierId: userId ?? undefined } as Prisma.SaleWhereInput)
      : {};

  // 🧩 Fetch data in parallel
  const [salesSummary, productStats, data] = await Promise.all([
    fetchSalesSummary(user.companyId, role, user.userId),
    fetchProductStats(role, user.companyId),
    FetchDebtSales(
      user.companyId,
      filter,
      usersquery,
      from,
      to,
      pageIndex,
      pageSize,
      parsedSort,
    ),
  ]);
  console.log(salesSummary);
  const currentUser = {
    id: userId,
    name: "", // can be fetched if needed
    email: "",
    role,
  };

  return (
    <ScrollArea className="flex h-[95vh] flex-col space-y-8 p-6" dir="rtl">
      <SellsDashboardClient
        user={currentUser}
        debtSales={data}
        recentSales={data}
        salesSummary={salesSummary}
        productStats={productStats}
      />
    </ScrollArea>
  );
}
