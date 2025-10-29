// app/actions/dashboard.ts
"use server";

import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";

import { unstable_cache } from "next/cache";
import { subDays } from "date-fns/subDays";

// 🚀 SINGLE OPTIMIZED FUNCTION - uses only Prisma methods

export const fetchDashboardData = unstable_cache(
  async (
    companyId: string,
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
    topItems?: number,
    revenue?: number,
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
      // ✅ Sales aggregate - WITH companyId
      prisma.sale.aggregate({
        _sum: { totalAmount: true },
        _count: { id: true },
        where: {
          companyId,
          saleDate: salesRange,
          status: "completed",
        },
      }),

      // ✅ Sales grouped by date - WITH companyId
      prisma.sale.groupBy({
        by: ["saleDate"],
        _sum: { totalAmount: true },
        where: {
          companyId,
          saleDate: {
            ...salesRange,
            gte: salesRange.gte || subDays(new Date(), 30),
          },
          status: "completed",
        },
        orderBy: { saleDate: "asc" },
        take: 30,
      }),

      // ✅ Purchases aggregate - WITH companyId
      prisma.purchase.aggregate({
        _sum: { amountPaid: true },
        where: {
          companyId,
          createdAt: purchasesRange,
        },
      }),

      // ✅ Purchases grouped by date - WITH companyId
      prisma.purchase.groupBy({
        by: ["createdAt"],
        _sum: { amountPaid: true },
        where: {
          companyId,
          createdAt: {
            ...purchasesRange,
          },
        },
        orderBy: { createdAt: "asc" },
        take: 50,
      }),

      // ✅ Revenue aggregate - WITH companyId
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          companyId,
          createdAt: revenueRange,
          status: "completed",
        },
      }),

      // ✅ Revenue grouped by date - WITH companyId
      prisma.payment.groupBy({
        by: ["createdAt"],
        _sum: { amount: true },
        where: {
          companyId,
          createdAt: {
            ...revenueRange,
          },
          status: "completed",
        },
        orderBy: { createdAt: "asc" },
      }),

      // ✅ Outstanding debt aggregate - WITH companyId
      prisma.sale.aggregate({
        _sum: { amountDue: true },
        where: {
          companyId,
          saleDate: debtRange,
          paymentStatus: { in: ["partial", "pending"] },
        },
        orderBy: { createdAt: "asc" },
      }),

      // ✅ Received debt aggregate - WITH companyId
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          companyId,
          createdAt: debtRange,
          paymentType: "outstanding_payment",
          status: "completed",
        },
        orderBy: { createdAt: "asc" },
      }),

      // ✅ Outstanding debt grouped - WITH companyId
      prisma.sale.groupBy({
        by: ["saleDate"],
        _sum: { amountDue: true },
        where: {
          companyId,
          saleDate: debtRange,
          paymentStatus: { in: ["partial", "pending"] },
        },
        orderBy: { saleDate: "asc" },
      }),

      // ✅ Received debt grouped - WITH companyId
      prisma.payment.groupBy({
        by: ["createdAt"],
        _sum: { amount: true },
        where: {
          companyId,
          createdAt: debtRange,
          paymentType: "outstanding_payment",
          status: "completed",
        },
        orderBy: { createdAt: "asc" },
      }),

      // ✅ Product stats - WITH companyId (already has it)
      role === "admin"
        ? prisma.inventory
            .aggregate({
              _sum: { stockQuantity: true },
              where: { companyId },
            })
            .then(async (stock) => {
              const [lowStockCount, zeroStockCount] = await Promise.all([
                prisma.inventory.count({
                  where: {
                    companyId,
                    stockQuantity: {
                      lte: prisma.inventory.fields.reorderLevel,
                    },
                  },
                }),
                prisma.inventory.count({
                  where: {
                    companyId,
                    stockQuantity: 0,
                  },
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

      // ✅ User count - WITH companyId (already has it)
      prisma.user.count({
        where: {
          companyId,
          isActive: true,
        },
      }),

      // ✅ Top selling products - WITH companyId
      prisma.saleItem
        .groupBy({
          by: ["productId"],
          _sum: { quantity: true },
          where: { companyId },
          orderBy: { _sum: { quantity: "desc" } },
          take: topItems || 10,
        })
        .then(async (items) => {
          if (items.length === 0) return [];

          const productIds = items.map((item) => item.productId);
          const products = await prisma.product.findMany({
            where: {
              id: { in: productIds },
              companyId,
            },
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

      // ✅ Recent sales (paginated) - WITH companyId
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
            where: {
              companyId,
              ...(pagination.query
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
                : {}),
            },
            skip: (pagination.page || 0) * (pagination.pageSize || 5),
            take: pagination.pageSize || 5,
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),

      // ✅ Activity logs - WITH companyId
      pagination
        ? prisma.activityLogs.findMany({
            include: {
              user: {
                select: { name: true },
              },
            },
            where: { companyId },
            skip: (pagination.page || 0) * (pagination.pageSize || 5),
            take: pagination.pageSize || 5,
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
    ]);

    // Helper function to group by day
    const groupByDay = (data: any[], dateField: string) => {
      const grouped = new Map<string, number>();

      data.forEach((item) => {
        const date = item[dateField].toISOString().split("T")[0];
        const rawValue = item._sum ? Object.values(item._sum)[0] : 0;
        const value = rawValue !== undefined ? Number(rawValue) : 0;

        grouped.set(date, (grouped.get(date) || 0) + (value || 0));
      });

      return Array.from(grouped.entries())
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 30);
    };

    // Helper function to group by month
    const groupByMonth = (data: any[], dateField: string) => {
      const grouped = new Map<string, number>();

      data.forEach((item) => {
        const dateObj = item[dateField];
        const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;

        const rawValue = item._sum ? Object.values(item._sum)[0] : 0;
        const value = rawValue !== undefined ? Number(rawValue) : 0;

        grouped.set(monthKey, (grouped.get(monthKey) || 0) + (value || 0));
      });

      return Array.from(grouped.entries())
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => a.date.localeCompare(b.date));
    };

    return {
      sales: {
        total: salesAgg._count.id || 0,
        totalAmount: salesAgg._sum.totalAmount?.toNumber() || 0,
        chart: groupByDay(salesGrouped, "saleDate"),
      },
      purchases: {
        total: purchasesAgg._sum.amountPaid?.toNumber() || 0,
        chart: groupByDay(purchasesGrouped, "createdAt"),
      },
      revenue: {
        total: revenueAgg._sum.amount?.toNumber() || 0,
        chart: groupByMonth(revenueGrouped, "createdAt"),
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
    };
  },
  ["dashboard-data"],
  { revalidate: 300, tags: ["dashboard"] },
);
// Optional: utility to serialize BigInt for JSON responses (if nee

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
