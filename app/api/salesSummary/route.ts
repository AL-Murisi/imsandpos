import { getActivityLogs } from "@/app/actions/activitylogs";
import {
  fetchSalesSummary,
  fetchProductStats,
  Fetchusers,
  FetchDebtSales,
} from "@/app/actions/sells";
import { fetchrevnu, getTopSellingProducts } from "@/app/actions/sells";
import { NextRequest, NextResponse } from "next/server";

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
      productStats,
      users,
      recentSales,
      topProducts,
      activityLogs,
      formData,
      revenue,
    ] = await Promise.all([
      fetchProductStats("admin"),
      Fetchusers(true),
      FetchDebtSales(filter, query, from, to, pageIndex, pageSize, parsedSort),
      getTopSellingProducts(Number(topItems), from, to, categoryId),
      getActivityLogs(pageIndex, pageSize, parsedSort),
      fetchAllFormData(),
      fetchrevnu(allFrom, allTo, revnue),
    ]);

    // Combine chart data here to avoid duplication

    // Serialize all data to handle BigInt
    const responseData = serializeBigInt({
      productStats,
      revenue,
      users,
      recentSales,
      topProducts,
      activityLogs,

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
      { status: 500 },
    );
  }
}
