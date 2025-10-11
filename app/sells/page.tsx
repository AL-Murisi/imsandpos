// app/sells/SellsDashboard.tsx
import {
  FetchDebtSales,
  fetchProductStats,
  fetchSalesSummary,
} from "@/app/actions/sells";
import { verifySession } from "@/lib/dal";
import { Prisma } from "@prisma/client";
import SellsDashboardClient from "./sellsDasboard";
import { SortingState } from "@tanstack/react-table";
import { ParsedSort } from "@/hooks/sort";
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
  const filter: Prisma.SaleWhereInput = {
    paymentStatus: {
      in: ["partial"],
    },
  };
  const parsedSort: SortingState = ParsedSort(sort);

  const { userId, userRole } = await verifySession();
  const role = userRole?.includes("admin") ? "admin" : "worker";

  const [salesSummary, productStats, data] = await Promise.all([
    fetchSalesSummary("admin"),
    fetchProductStats("admin"),
    FetchDebtSales(
      filter,
      usersquery,
      from,
      to,
      pageIndex,
      pageSize,
      parsedSort,
    ),
  ]);

  const currentUser = {
    id: userId,
    name: "", // Optional: fetch user info if you need
    email: "",
    role,
  };

  return (
    <SellsDashboardClient
      user={currentUser}
      debtSales={data}
      recentSales={data}
      salesSummary={salesSummary}
      productStats={productStats}
    />
  );
}
