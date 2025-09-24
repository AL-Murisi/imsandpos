// app/sells/SellsDashboard.tsx
import {
  FetchDebtSales,
  fetchProductStats,
  fetchSalesSummary,
} from "@/app/actions/debtSells";
import { verifySession } from "@/lib/dal";
import { Prisma } from "@prisma/client";
import SellsDashboardClient from "./sellsDasboard";
export default async function SellsDashboard() {
  const { userId, userRole } = await verifySession();

  const role = userRole?.includes("admin") ? "admin" : "worker";
  const filter: Prisma.SaleWhereInput = {
    paymentStatus: {
      in: ["paid"],
    },
  };
  const [salesSummary, productStats, data] = await Promise.all([
    fetchSalesSummary("admin"),
    fetchProductStats("admin"),
    FetchDebtSales(filter),
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
