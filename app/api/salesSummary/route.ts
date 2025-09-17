// // app/api/salesSummary/route.ts
// import prisma from "@/lib/prisma";
// import { NextRequest, NextResponse } from "next/server";

import { getActivityLogs } from "@/app/actions/activitylogs";
import {
  fetchSalesSummary,
  fetchProductStats,
  Fetchusers,
  FetchDebtSales,
} from "@/app/actions/debtSells";
import { fetchrevnu, getTopSellingProducts } from "@/app/actions/sells";
import { NextRequest, NextResponse } from "next/server";

// export async function GET(req: NextRequest) {
//   try {
//     const { searchParams } = new URL(req.url);

//     const salesFrom = searchParams.get("salesFrom");
//     const salesTo = searchParams.get("salesTo");
//     const purchasesFrom = searchParams.get("purchasesFrom");
//     const purchasesTo = searchParams.get("purchasesTo");
//     const revenueFrom = searchParams.get("revenueFrom");
//     const revenueTo = searchParams.get("revenueTo");
//     const debtFrom = searchParams.get("debtFrom");
//     const debtTo = searchParams.get("debtTo");
//     const allFrom = searchParams.get("allFrom");
//     const allTo = searchParams.get("allTo");

//     const formatRange = (from?: string | null, to?: string | null) => ({
//       ...(from ? { gte: new Date(from) } : {}),
//       ...(to ? { lte: new Date(to) } : {}),
//     });

//     const salesRange = formatRange(salesFrom || allFrom, salesTo || allTo);
//     const purchasesRange = formatRange(
//       purchasesFrom || allFrom,
//       purchasesTo || allTo
//     );
//     const revenueRange = formatRange(
//       revenueFrom || allFrom,
//       revenueTo || allTo
//     );
//     const debtRange = formatRange(debtFrom || allFrom, debtTo || allTo);

//     const [
//       totalSalesAgg,
//       salesOverTime,
//       totalPurchasesAgg,
//       purchasesOverTime,
//       totalRevenueAgg,
//       revenueOverTime,
//       totalDebtAgg,
//       debtPaymentsAgg,
//       debtOverTime,
//     ] = await Promise.all([
//       prisma.sale.aggregate({
//         _count: { id: true },
//         where: { saleDate: salesRange, status: "completed" },
//       }),
//       prisma.sale.groupBy({
//         by: ["saleDate"],
//         _sum: { totalAmount: true },
//         where: { saleDate: salesRange, status: "completed" },
//         orderBy: { saleDate: "asc" },
//       }),
//       prisma.product.aggregate({
//         _sum: { costPrice: true },
//         where: { createdAt: purchasesRange },
//       }),
//       prisma.product.groupBy({
//         by: ["createdAt"],
//         _sum: { costPrice: true },
//         where: { createdAt: purchasesRange },
//         orderBy: { createdAt: "asc" },
//       }),
//       prisma.payment.aggregate({
//         _sum: { amount: true },
//         where: { createdAt: revenueRange, status: "completed" },
//       }),
//       prisma.payment.groupBy({
//         by: ["createdAt"],
//         _sum: { amount: true },
//         where: { createdAt: revenueRange, status: "completed" },
//         orderBy: { createdAt: "asc" },
//       }),
//       prisma.sale.aggregate({
//         _sum: { amountDue: true },
//         where: { saleDate: debtRange },
//       }),
//       prisma.payment.aggregate({
//         _sum: { amount: true },
//         _count: { id: true },
//         where: {
//           createdAt: debtRange,
//           paymentType: { in: ["outstanding_payment"] },
//           status: "completed",
//         },
//       }),
//       prisma.payment.groupBy({
//         by: ["createdAt"],
//         _sum: { amount: true },
//         where: {
//           createdAt: debtRange,
//           paymentType: { in: ["outstanding_payment"] },
//           status: "completed",
//         },
//         orderBy: { createdAt: "asc" },
//       }),
//     ]);

//     const salesChart = salesOverTime.map((s) => ({
//       date: s.saleDate.toISOString().split("T")[0],
//       value: s._sum.totalAmount?.toNumber() || 0,
//     }));
//     const purchasesChart = purchasesOverTime.map((p) => ({
//       date: p.createdAt.toISOString().split("T")[0],
//       value: p._sum.costPrice?.toNumber() || 0,
//     }));
//     const revenueChart = revenueOverTime.map((r) => ({
//       date: r.createdAt.toISOString().split("T")[0],
//       value: r._sum.amount?.toNumber() || 0,
//     }));
//     const debtChart = debtOverTime.map((d) => ({
//       date: d.createdAt.toISOString().split("T")[0],
//       value: d._sum.amount?.toNumber() || 0,
//     }));

//     const responseData = {
//       sales: { total: totalSalesAgg._count.id, chart: salesChart },
//       purchases: {
//         total: totalPurchasesAgg._sum.costPrice?.toNumber() || 0,
//         chart: purchasesChart,
//       },
//       revenue: {
//         total: totalRevenueAgg._sum.amount?.toNumber() || 0,
//         chart: revenueChart,
//       },
//       debt: {
//         totalDebt: totalDebtAgg._sum.amountDue?.toNumber() || 0,
//         received: debtPaymentsAgg._sum.amount?.toNumber() || 0,
//         chart: debtChart,
//       },
//     };

//     return NextResponse.json(responseData);
//   } catch (error) {
//     console.error("Failed to fetch sales summary:", error);
//     return NextResponse.json(
//       { message: "Internal server error" },
//       { status: 500 }
//     );
//   }
// }import { NextRequest, NextResponse } from 'next/server';

// 1. Create utility function to handle BigInt serialization
// utils/bigintSerializer.ts
function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "bigint") {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }

  if (typeof obj === "object") {
    const serialized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        serialized[key] = serializeBigInt(obj[key]);
      }
    }
    return serialized;
  }

  return obj;
}
import { ParsedSort } from "@/hooks/sort";
import { Prisma } from "@prisma/client";
import { fetchAllFormData } from "@/app/actions/roles";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;

  // Extract all parameters with defaults
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const categoryId = searchParams.get("categoryId") || "";
  const query = searchParams.get("query") || "";
  const page = searchParams.get("page") || "1";
  const limit = searchParams.get("limit") || "7";

  const salesFrom = searchParams.get("salesFrom") || undefined;
  const salesTo = searchParams.get("salesTo") || undefined;
  const purchasesFrom = searchParams.get("purchasesFrom") ?? undefined;
  const purchasesTo = searchParams.get("purchasesTo") || undefined;
  const revenueFrom = searchParams.get("revenueFrom") || undefined;
  const revenueTo = searchParams.get("revenueTo") || undefined;
  const debtFrom = searchParams.get("debtFrom") || undefined;
  const debtTo = searchParams.get("debtTo") || undefined;
  const chartFrom = searchParams.get("chartFrom") ?? undefined;
  const chartTo = searchParams.get("chartTo") || undefined;
  const allFrom = searchParams.get("allFrom") || undefined;
  const allTo = searchParams.get("allTo") || undefined;
  const sort = searchParams.get("sort") || "";
  const revnue = searchParams.get("revnueDate") || undefined;
  const topItems = searchParams.get("topItems") || "5";
  // Process pagination
  const pageIndex = Number(page) - 1;
  const pageSize = Number(limit);

  // Combine filters
  const filters = {
    salesFrom,
    salesTo,
    purchasesFrom,
    purchasesTo,
    revenueFrom,
    revenueTo,
    debtFrom,
    debtTo,
    chartFrom,
    chartTo,
    allFrom,
    allTo,
  };

  // Parse sort
  const parsedSort = ParsedSort(sort);

  // Create filter for debt sales
  const filter: Prisma.SaleWhereInput = {
    // Add your filter logic here if needed
  };

  try {
    // Single comprehensive data fetch
    const [
      salesSummary,
      productStats,
      users,
      recentSales,
      topProducts,
      activityLogs,
      formData,
      revenue,
    ] = await Promise.all([
      fetchSalesSummary("admin", filters),
      fetchProductStats("admin"),
      Fetchusers(true),
      FetchDebtSales(filter, query, from, to, pageIndex, pageSize, parsedSort),
      getTopSellingProducts(Number(topItems), from, to, categoryId),
      getActivityLogs(pageIndex, pageSize, parsedSort),
      fetchAllFormData(),
      fetchrevnu(allFrom, allTo, revnue),
    ]);

    // Combine chart data here to avoid duplication
    // Combine chart data here to avoid duplication
    const combinedChartData = salesSummary.sales.chart.map((sale) => {
      const purchase = salesSummary.purchases.chart.find(
        (p) => p.date === sale.date
      );
      return {
        date: sale.date,
        revenue: sale.value,
        purchases: purchase?.value || 0,
      };
    });

    // Serialize all data to handle BigInt
    const responseData = serializeBigInt({
      summary: salesSummary,
      productStats,
      revenue,
      users,
      recentSales,
      topProducts,
      activityLogs,
      combinedChartData,
      formData,

      pagination: {
        page: pageIndex + 1,
        limit: pageSize,
        total: recentSales.length,
      },
    });
    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch dashboard data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
