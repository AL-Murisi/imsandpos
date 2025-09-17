"use server";
import { getActivityLogs } from "./activitylogs";
import {
  FetchDebtSales,
  fetchProductStats,
  fetchSalesSummary,
  Fetchusers,
} from "./debtSells";
import { fetchAllFormData } from "./roles";
import { getTopSellingProducts } from "./sells";

// actions/dashboard.ts
export async function getDashboardData(params: any) {
  const [
    formData,
    // salesSummary,
    productStats,
    users,
    recentSales,
    topProducts,
    logs,
  ] = await Promise.all([
    fetchAllFormData(),

    // fetchSalesSummary("admin", params.filters),
    fetchProductStats("admin"),
    Fetchusers(true),
    FetchDebtSales(
      params.filter,
      params.query,
      params.from,
      params.to,
      params.pageIndex,
      params.pageSize,
      params.parsedSort
    ),
    getTopSellingProducts(10, params.from, params.to, params.categoryId),
    getActivityLogs(),
  ]);
  // const combinedChartData = salesSummary.sales.chart.map((sale) => {
  //   const purchase = salesSummary.purchases.chart.find(
  //     (p) => p.date === sale.date
  //   );

  //   return {
  //     date: sale.date,
  //     revenue: sale.value, // use .value instead of ._sum.totalAmount
  //     purchases: purchase?.value || 0, // use .value instead of ._sum.costPrice
  //   };
  // });

  return {
    formData,
    // salesSummary,
    productStats,
    users,
    recentSales,
    topProducts,
    logs,
    // combinedChartData,
  };
}
