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

interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Get Sales Overview Data (Revenue + Purchases combined)
 * This powers the main area chart showing both metrics over time
 */
export async function getSalesOverview(
  companyId: string,
  { startDate, endDate }: DateRange,
) {
  // Get revenue data from REVENUE accounts
  const revenueEntries = await prisma.journal_entries.findMany({
    where: {
      accounts: {
        company_id: companyId,
        account_type: "REVENUE",
        is_active: true,
      },
      is_posted: true,
      entry_date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      entry_date: true,
      credit: true,
      debit: true,
    },
    orderBy: { entry_date: "asc" },
  });

  // Get purchase/expense data from EXPENSE and COST_OF_GOODS accounts
  const purchaseEntries = await prisma.journal_entries.findMany({
    where: {
      accounts: {
        company_id: companyId,
        account_type: { in: ["EXPENSE", "COST_OF_GOODS"] },
        is_active: true,
      },
      is_posted: true,
      entry_date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      entry_date: true,
      credit: true,
      debit: true,
    },
    orderBy: { entry_date: "asc" },
  });

  // Group by date
  const revenueByDate = new Map<string, number>();
  const purchasesByDate = new Map<string, number>();

  // Aggregate revenue (credit - debit for revenue accounts)
  revenueEntries.forEach((entry) => {
    if (!entry.entry_date) return;
    const dateKey = entry.entry_date.toISOString().split("T")[0];
    const amount = Number(entry.credit) - Number(entry.debit);
    revenueByDate.set(dateKey, (revenueByDate.get(dateKey) || 0) + amount);
  });

  // Aggregate purchases (debit - credit for expense accounts)
  purchaseEntries.forEach((entry) => {
    if (!entry.entry_date) return;
    const dateKey = entry.entry_date.toISOString().split("T")[0];
    const amount = Number(entry.debit) - Number(entry.credit);
    purchasesByDate.set(dateKey, (purchasesByDate.get(dateKey) || 0) + amount);
  });

  // Combine all dates
  const allDates = new Set([
    ...revenueByDate.keys(),
    ...purchasesByDate.keys(),
  ]);

  const combined = Array.from(allDates)
    .sort()
    .map((date) => ({
      date,
      revenue: revenueByDate.get(date) || 0,
      purchases: purchasesByDate.get(date) || 0,
    }));

  return {
    data: combined,
    totalRevenue: Array.from(revenueByDate.values()).reduce((a, b) => a + b, 0),
    totalPurchases: Array.from(purchasesByDate.values()).reduce(
      (a, b) => a + b,
      0,
    ),
  };
}

/**
 * Get Revenue Chart Data (for single metric bar chart)
 */
export async function getRevenueChart(
  companyId: string,
  { startDate, endDate }: DateRange,
) {
  const entries = await prisma.journal_entries.findMany({
    where: {
      accounts: {
        company_id: companyId,
        account_type: "REVENUE",
        is_active: true,
      },
      is_posted: true,
      entry_date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      entry_date: true,
      credit: true,
      debit: true,
    },
    orderBy: { entry_date: "asc" },
  });

  const revenueByDate = new Map<string, number>();

  entries.forEach((entry) => {
    if (!entry.entry_date) return;
    const dateKey = entry.entry_date.toISOString().split("T")[0];
    const amount = Number(entry.credit) - Number(entry.debit);
    revenueByDate.set(dateKey, (revenueByDate.get(dateKey) || 0) + amount);
  });

  return Array.from(revenueByDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, total]) => ({
      date,
      total,
      key: date,
    }));
}

/**
 * Get Top Selling Products
 * Uses groupBy to aggregate sales by product
 */
export async function getTopSellingProducts(
  companyId: string,
  { startDate, endDate }: DateRange,
  limit: number = 10,
) {
  const items = await prisma.saleItem
    .groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      where: {
        companyId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { _sum: { quantity: "desc" } },
      take: limit,
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
    });

  return items;
}

/**
 * Get Expense Breakdown by Category (for Pie Chart)
 * This shows where your money is going
 */
export async function getExpenseBreakdown(
  companyId: string,
  { startDate, endDate }: DateRange,
) {
  const expenses = await prisma.accounts.findMany({
    where: {
      company_id: companyId,
      account_type: { in: ["EXPENSE", "COST_OF_GOODS"] },
      is_active: true,
    },
    include: {
      journal_entries: {
        where: {
          is_posted: true,
          entry_date: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          debit: true,
          credit: true,
        },
      },
    },
  });

  const categoryTotals = expenses.map((account) => {
    const total = account.journal_entries.reduce(
      (sum, entry) => sum + Number(entry.debit) - Number(entry.credit),
      0,
    );

    return {
      category: account.account_name_en,
      amount: total,
      percentage: 0, // Will calculate after
    };
  });

  // Calculate percentages
  const totalExpenses = categoryTotals.reduce(
    (sum, cat) => sum + cat.amount,
    0,
  );

  const chartData = categoryTotals
    .filter((cat) => cat.amount > 0)
    .map((cat, index) => ({
      id: index + 1,
      browser: cat.category, // Using same format as your existing pie chart
      visitors: cat.amount,
      fill: `var(--chart-${(index % 5) + 1})`,
      percentage: ((cat.amount / totalExpenses) * 100).toFixed(1),
    }))
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, 5); // Top 5 categories

  return chartData;
}

/**
 * Alternative: Revenue Breakdown by Product Category (for Pie Chart)
 */
export async function getRevenueByCategory(
  companyId: string,
  { startDate, endDate }: DateRange,
) {
  const categoryRevenue = await prisma.$queryRaw<
    Array<{ category: string; total: number }>
  >`
    SELECT 
      COALESCE(p.category, 'Other') as category,
      SUM(ii.quantity * ii.unit_price) as total
    FROM invoice_items ii
    JOIN invoices i ON ii.invoice_id = i.invoice_id
    JOIN products p ON ii.product_id = p.product_id
    WHERE i.company_id = ${companyId}
      AND i.invoice_date >= ${startDate}
      AND i.invoice_date <= ${endDate}
      AND i.status = 'PAID'
    GROUP BY p.category
    ORDER BY total DESC
    LIMIT 5
  `;

  return categoryRevenue.map((cat, index) => ({
    id: index + 1,
    browser: cat.category,
    visitors: Number(cat.total),
    fill: `var(--chart-${(index % 5) + 1})`,
  }));
}

/**
 * Get Complete Dashboard Data
 * Single function to fetch all dashboard metrics
 */
export async function getDashboardData(
  companyId: string,
  { startDate, endDate }: DateRange,
  topItems: number = 10,
) {
  const [salesOverview, revenueChart, topProducts, expenseBreakdown] =
    await Promise.all([
      getSalesOverview(companyId, { startDate, endDate }),
      getRevenueChart(companyId, { startDate, endDate }),
      getTopSellingProducts(companyId, { startDate, endDate }, topItems),
      getExpenseBreakdown(companyId, { startDate, endDate }),
    ]);

  return {
    salesOverview: {
      data: salesOverview.data,
      totalRevenue: salesOverview.totalRevenue,
      totalPurchases: salesOverview.totalPurchases,
      netProfit: salesOverview.totalRevenue - salesOverview.totalPurchases,
    },
    revenueChart,
    topProducts,
    expenseBreakdown,
  };
}

/**
 * Get Summary Cards Data
 */
export async function getSummaryCards(
  company_id: string,
  { startDate, endDate }: DateRange,
) {
  // Revenue
  const revenue = await prisma.journal_entries.aggregate({
    where: {
      accounts: {
        company_id,
        account_type: "REVENUE",
        is_active: true,
      },
      is_posted: true,
      entry_date: { gte: startDate, lte: endDate },
    },
    _sum: {
      credit: true,
      debit: true,
    },
  });

  // Purchases/Expenses
  const purchases = await prisma.journal_entries.aggregate({
    where: {
      accounts: {
        company_id,
        account_type: { in: ["EXPENSE"] },
        is_active: true,
      },
      is_posted: true,
      entry_date: { gte: startDate, lte: endDate },
    },
    _sum: {
      debit: true,
      credit: true,
    },
  });

  // Debts (assuming you have customer accounts or AR)
  const unreceived = await prisma.journal_entries.aggregate({
    where: {
      accounts: {
        company_id,
        account_type: "ASSET",
        account_name_en: { contains: "Receivable" },
        is_active: true,
      },
      is_posted: true,
    },
    _sum: {
      debit: true,
      credit: true,
    },
  });

  const totalRevenue =
    Number(revenue._sum.credit || 0) - Number(revenue._sum.debit || 0);
  const totalPurchases =
    Number(purchases._sum.debit || 0) - Number(purchases._sum.credit || 0);
  const totalUnreceived =
    Number(unreceived._sum.debit || 0) - Number(unreceived._sum.credit || 0);

  return {
    revenue: { total: totalRevenue },
    purchases: { total: totalPurchases },
    debt: { unreceived: totalUnreceived },
    netProfit: totalRevenue - totalPurchases,
  };
}

/**
 * Get Product Statistics
 */
export async function getProductStats(companyId: string) {
  const products = await prisma.inventory.findMany({
    where: {
      companyId: companyId,
      // is_active: true // Add if you have this field
    },
    select: {
      stockQuantity: true,
      reorderLevel: true,
    },
  });

  const totalStockQuantity = products.reduce(
    (sum, p) => sum + (p.stockQuantity || 0),
    0,
  );
  const lowStockProducts = products.filter(
    (p) => p.stockQuantity > 0 && p.stockQuantity <= (p.reorderLevel || 0),
  ).length;
  const zeroProducts = products.filter((p) => p.stockQuantity === 0).length;

  return {
    totalStockQuantity,
    lowStockProducts,
    zeroProducts,
  };
}

/**
 * Get User Count
 */
export async function getUserCount(companyId: string) {
  const count = await prisma.user.count({
    where: {
      companyId: companyId,
      // is_active: true // Add if you have this field
    },
  });

  return { users: count };
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
