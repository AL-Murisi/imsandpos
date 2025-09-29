// app/actions/dashboard.ts
"use server";

import { getActivityLogs } from "./activitylogs";
import {
  FetchDebtSales,
  fetchProductStats,
  fetchSalesSummary,
  Fetchusers,
  getTopSellingProducts,
  fetchrevnu,
} from "./sells";
import { fetchAllFormData } from "./roles";
import { ParsedSort } from "@/hooks/sort";
import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";

import { unstable_cache } from "next/cache";
import { startOfDay, endOfDay, format, subDays } from "date-fns";

// 🚀 SINGLE OPTIMIZED FUNCTION - uses only Prisma methods
export const fetchDashboardData = unstable_cache(
  async (
    role: string,
    filters?: {
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
    },
    pagination?: {
      page?: number;
      pageSize?: number;
      query?: string;
      sort?: string;
    },
  ) => {
    const formatRange = (from?: string, to?: string) => ({
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    });

    const salesRange = formatRange(
      filters?.salesFrom || filters?.allFrom,
      filters?.salesTo || filters?.allTo,
    );
    const purchasesRange = formatRange(
      filters?.purchasesFrom || filters?.allFrom,
      filters?.purchasesTo || filters?.allTo,
    );
    const revenueRange = formatRange(
      filters?.revenueFrom || filters?.allFrom,
      filters?.revenueTo || filters?.allTo,
    );
    const debtRange = formatRange(
      filters?.debtFrom || filters?.allFrom,
      filters?.debtTo || filters?.allTo,
    );

    // 🔥 OPTIMIZED: All queries in parallel using Prisma methods
    const [
      // Sales data
      salesAgg,
      salesGrouped,
      // Purchases data
      purchasesAgg,
      purchasesGrouped,
      // Revenue data
      revenueAgg,
      revenueGrouped,
      // Debt data
      debtUnreceivedAgg,
      debtReceivedAgg,
      debtUnreceivedGrouped,
      debtReceivedGrouped,
      // Other data
      productStats,
      userCount,
      topProducts,
      recentSales,
      activityLogs,
    ] = await Promise.all([
      // Sales aggregate
      prisma.sale.aggregate({
        _sum: { totalAmount: true },
        _count: { id: true },
        where: { saleDate: salesRange, status: "completed" },
      }),

      // Sales grouped by date (limit to last 30 days for performance)
      prisma.sale.groupBy({
        by: ["saleDate"],
        _sum: { totalAmount: true },
        where: {
          saleDate: {
            ...salesRange,
            gte: salesRange.gte || subDays(new Date(), 30),
          },
          status: "completed",
        },
        orderBy: { saleDate: "asc" },
        take: 30,
      }),

      // Purchases aggregate
      prisma.product.aggregate({
        _sum: { costPrice: true },
        where: { createdAt: purchasesRange },
      }),

      // Purchases grouped by date
      prisma.product.groupBy({
        by: ["createdAt"],
        _sum: { costPrice: true },
        where: {
          createdAt: {
            ...purchasesRange,
            gte: purchasesRange.gte || subDays(new Date(), 30),
          },
        },
        orderBy: { createdAt: "asc" },
        take: 30,
      }),

      // Revenue aggregate
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { createdAt: revenueRange, status: "completed" },
      }),

      // Revenue grouped by date
      prisma.payment.groupBy({
        by: ["createdAt"],
        _sum: { amount: true },
        where: {
          createdAt: {
            ...revenueRange,
            gte: revenueRange.gte || subDays(new Date(), 90),
          },
          status: "completed",
        },
        orderBy: { createdAt: "asc" },
        take: 30,
      }),

      // Outstanding debt aggregate
      prisma.sale.aggregate({
        _sum: { amountDue: true },
        where: {
          saleDate: debtRange,
          paymentStatus: { in: ["partial", "pending"] },
        },
      }),

      // Received debt aggregate
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          createdAt: debtRange,
          paymentType: "outstanding_payment",
          status: "completed",
        },
      }),

      // Outstanding debt grouped (monthly for performance)
      prisma.sale.groupBy({
        by: ["saleDate"],
        _sum: { amountDue: true },
        where: {
          saleDate: debtRange,
          paymentStatus: { in: ["partial", "pending"] },
        },
        orderBy: { saleDate: "asc" },
      }),

      // Received debt grouped (monthly)
      prisma.payment.groupBy({
        by: ["createdAt"],
        _sum: { amount: true },
        where: {
          createdAt: debtRange,
          paymentType: "outstanding_payment",
          status: "completed",
        },
        orderBy: { createdAt: "asc" },
      }),

      // Product stats (only for admin)
      role === "admin"
        ? prisma.inventory
            .aggregate({
              _sum: { stockQuantity: true },
            })
            .then(async (stock) => {
              const [lowStockCount, zeroStockCount] = await Promise.all([
                prisma.inventory.count({
                  where: {
                    stockQuantity: {
                      lte: prisma.inventory.fields.reorderLevel,
                    },
                  },
                }),
                prisma.inventory.count({
                  where: { stockQuantity: 0 },
                }),
              ]);

              return {
                totalStockQuantity: stock._sum.stockQuantity || 0,
                lowStockProducts: lowStockCount,
                zeroProducts: zeroStockCount,
              };
            })
        : Promise.resolve({
            totalStockQuantity: 0,
            lowStockProducts: 0,
            zeroProducts: 0,
          }),

      // User count
      prisma.user.count({ where: { isActive: true } }),

      // Top selling products (last 30 days)
      prisma.saleItem
        .groupBy({
          by: ["productId"],
          _sum: { quantity: true },
          where: {
            createdAt: { gte: subDays(new Date(), 30) },
          },
          orderBy: { _sum: { quantity: "desc" } },
          take: 5,
        })
        .then(async (items) => {
          const productIds = items.map((item) => item.productId);
          const products = await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true },
          });

          return items.map((item) => {
            const product = products.find((p) => p.id === item.productId);
            return {
              name: product?.name || "Unknown Product",
              quantity: item._sum.quantity || 0,
            };
          });
        }),

      // Recent sales (paginated)
      pagination
        ? prisma.sale.findMany({
            select: {
              id: true,
              totalAmount: true,
              amountPaid: true,
              amountDue: true,
              saleDate: true,
              createdAt: true,
              paymentStatus: true,
              customerId: true,
              customer: {
                select: {
                  name: true,
                  phoneNumber: true,
                  customerType: true,
                },
              },
            },
            where: pagination.query
              ? {
                  OR: [
                    {
                      customer: {
                        name: {
                          contains: pagination.query,
                          mode: "insensitive",
                        },
                      },
                    },
                    {
                      customer: {
                        phoneNumber: {
                          contains: pagination.query,
                          mode: "insensitive",
                        },
                      },
                    },
                    {
                      paymentStatus: {
                        contains: pagination.query,
                        mode: "insensitive",
                      },
                    },
                  ],
                }
              : {},
            skip: (pagination.page || 0) * (pagination.pageSize || 5),
            take: pagination.pageSize || 5,
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),

      // Activity logs (if needed)
      pagination
        ? prisma.activityLogs.findMany({
            include: {
              user: {
                select: { name: true },
              },
            },
            skip: (pagination.page || 0) * (pagination.pageSize || 5),
            take: pagination.pageSize || 5,
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
    ]);

    // Helper function to group by day
    // Updated Helper function to group by day (Apply the BigInt to Number conversion)
    const groupByDay = (data: any[], dateField: string) => {
      const grouped = new Map<string, number>();

      data.forEach((item) => {
        const date = item[dateField].toISOString().split("T")[0];

        // 🔥 FIX: Explicitly convert the BigInt value using Number()
        const rawValue = item._sum ? Object.values(item._sum)[0] : 0;
        const value = rawValue !== undefined ? Number(rawValue) : 0; // Use Number() for BigInt conversion

        grouped.set(date, (grouped.get(date) || 0) + (value || 0));
      });

      // ... rest of the function remains the same ...
      return Array.from(grouped.entries())
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 30); // Limit chart points
    };

    // Updated Helper function to group by month (Apply the BigInt to Number conversion)
    const groupByMonth = (data: any[], dateField: string) => {
      const grouped = new Map<string, number>();

      data.forEach((item) => {
        const dateObj = item[dateField];
        const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;

        // 🔥 FIX: Explicitly convert the BigInt value using Number()
        const rawValue = item._sum ? Object.values(item._sum)[0] : 0;
        const value = rawValue !== undefined ? Number(rawValue) : 0; // Use Number() for BigInt conversion

        grouped.set(monthKey, (grouped.get(monthKey) || 0) + (value || 0));
      });

      // ... rest of the function remains the same ...
      return Array.from(grouped.entries())
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => a.date.localeCompare(b.date));
    };
    return serializeBigInt({
      sales: {
        total: salesAgg._count.id || 0,
        chart: groupByDay(salesGrouped, "saleDate"),
      },
      purchases: {
        total: purchasesAgg._sum.costPrice?.toNumber() || 0,
        chart: groupByDay(purchasesGrouped, "createdAt"),
      },
      revenue: {
        total: revenueAgg._sum.amount?.toNumber() || 0,
        chart: groupByDay(revenueGrouped, "createdAt"),
      },
      debt: {
        unreceived: debtUnreceivedAgg._sum.amountDue?.toNumber() || 0,
        received: debtReceivedAgg._sum.amount?.toNumber() || 0,
        unreceivedChart: groupByMonth(debtUnreceivedGrouped, "saleDate"),
        receivedChart: groupByMonth(debtReceivedGrouped, "createdAt"),
      },
      productStats,
      users: { users: userCount },
      topProducts,
      recentSales: recentSales.map((sale) => ({
        ...sale,
        totalAmount: sale.totalAmount.toNumber(),
        amountPaid: sale.amountPaid.toNumber(),
        amountDue: sale.amountDue.toNumber(),
        saleDate: sale.saleDate.toISOString(),
        createdAt: sale.createdAt.toISOString(),
      })),
      activityLogs,
    });
  },
  ["dashboard-data"],
  { revalidate: 300, tags: ["dashboard"] },
);

// Optional: utility to serialize BigInt for JSON responses (if nee
function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "bigint") return obj.toString();
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === "object") {
    const serialized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        serialized[key] = serializeBigInt(obj[key]);
      }
    }
    return serialized;
  }
  return obj;
}

export interface DashboardParams {
  filter?: Prisma.SaleWhereInput;
  query?: string;
  from?: string;
  to?: string;
  categoryId?: string;
  pageIndex?: number;
  pageSize?: number;
  sort?: string;
  topItems?: number;
  allFrom?: string;
  allTo?: string;
}

export async function getDashboardData(
  p0: string,
  params: DashboardParams,
  pagination: { page: number; pageSize: number; query: string; sort: string },
) {
  const {
    filter = {},
    query = "",
    from = "",
    to = "",
    categoryId = "",
    pageIndex = 0,
    pageSize = 7,
    sort = "",
    topItems = 5,
    allFrom,
    allTo,
  } = params;

  const parsedSort = ParsedSort(sort);

  // Parallel fetching of all dashboard data
  const [
    formData,
    productStats,
    users,
    recentSales,
    topProducts,
    activityLogs,
    revenue,
  ] = await Promise.all([
    fetchAllFormData(),
    fetchProductStats("admin"),
    Fetchusers(true),
    FetchDebtSales(filter, query, from, to, pageIndex, pageSize, parsedSort),
    getTopSellingProducts(topItems, from, to, categoryId),
    getActivityLogs(pageIndex, pageSize, parsedSort),
    fetchrevnu(allFrom, allTo, "day", topItems),
  ]);
  return serializeBigInt({
    formData,
    productStats,
    users,
    recentSales,
    topProducts,
    activityLogs,
    revenue,
    pagination: {
      page: pageIndex + 1,
      limit: pageSize,
      total: recentSales.length,
    },
  });
}
