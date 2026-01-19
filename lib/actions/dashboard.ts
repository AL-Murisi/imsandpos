// app/actions/dashboard.ts
"use server";

import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";

import { unstable_cache } from "next/cache";
import { subDays } from "date-fns/subDays";

// 🚀 SINGLE OPTIMIZED FUNCTION - uses only Prisma methods

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
  // Get revenue data (REVENUE ACCOUNTS)
  const revenueEntries = await prisma.journal_entries.findMany({
    where: {
      accounts: {
        company_id: companyId,
        account_type: "REVENUE",
        is_active: true,
      },
      is_posted: true,
      entry_date: { gte: startDate, lte: endDate },
    },
    select: { entry_date: true, credit: true, debit: true },
    orderBy: { entry_date: "asc" },
  });

  // Purchases / Expenses (EXPENSE ACCOUNTS)
  const purchaseEntries = await prisma.journal_entries.findMany({
    where: {
      accounts: {
        company_id: companyId,
        account_type: "EXPENSE",
        is_active: true,
      },
      is_posted: true,
      entry_date: { gte: startDate, lte: endDate },
    },
    select: { entry_date: true, credit: true, debit: true },
    orderBy: { entry_date: "asc" },
  });

  // Debts (AR)
  const debtEntries = await prisma.accounts.findMany({
    where: {
      company_id: companyId,
      account_category: "ACCOUNTS_RECEIVABLE",
      is_active: true,
      updated_at: { gte: startDate, lte: endDate },
    },
    select: { updated_at: true, balance: true },
    orderBy: { updated_at: "asc" },
  });

  // Maps for daily grouping
  const revenueByDate = new Map<string, number>();
  const purchasesByDate = new Map<string, number>();
  const debtByDate = new Map<string, number>();
  const profitByDate = new Map<string, number>(); // NEW

  // --- Revenue Aggregation (credit - debit) ---
  revenueEntries.forEach((entry) => {
    if (!entry.entry_date) return;
    const dateKey = entry.entry_date.toISOString().split("T")[0];
    const amount = Math.max(0, Number(entry.credit) - Number(entry.debit));
    revenueByDate.set(dateKey, (revenueByDate.get(dateKey) || 0) + amount);
  });

  // --- Debt Aggregation ---
  debtEntries.forEach((entry) => {
    if (!entry.updated_at) return;
    const dateKey = entry.updated_at.toISOString().split("T")[0];
    const amount = Math.max(0, Number(entry.balance));
    debtByDate.set(dateKey, (debtByDate.get(dateKey) || 0) + amount);
  });

  // --- Purchases Aggregation (debit - credit) ---
  purchaseEntries.forEach((entry) => {
    if (!entry.entry_date) return;
    const dateKey = entry.entry_date.toISOString().split("T")[0];
    const amount = Math.max(0, Number(entry.debit) - Number(entry.credit));
    purchasesByDate.set(dateKey, (purchasesByDate.get(dateKey) || 0) + amount);
  });

  // --- PROFIT PER DATE (revenue - purchases) ---
  const allDates = new Set([
    ...revenueByDate.keys(),
    ...purchasesByDate.keys(),
    ...debtByDate.keys(),
  ]);

  allDates.forEach((date) => {
    const revenue = revenueByDate.get(date) || 0;
    const purchases = purchasesByDate.get(date) || 0;
    const profit = Math.max(0, revenue - purchases); // no negatives
    profitByDate.set(date, profit);
  });

  // --- Combined Data (for chart) ---
  const combined = Array.from(allDates)
    .sort()
    .map((date) => ({
      date,
      revenue: revenueByDate.get(date) || 0,
      purchases: purchasesByDate.get(date) || 0,
      debts: debtByDate.get(date) || 0,
      profit: profitByDate.get(date) || 0, // NEW
    }));

  return {
    data: combined,
    totalRevenue: [...revenueByDate.values()].reduce((a, b) => a + b, 0),
    totalPurchases: [...purchasesByDate.values()].reduce((a, b) => a + b, 0),
    totalDebt: [...debtByDate.values()].reduce((a, b) => a + b, 0),
    totalProfit: [...profitByDate.values()].reduce((a, b) => a + b, 0), // NEW
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

  const revenueByMonth = new Map<string, number>();

  entries.forEach((entry) => {
    if (!entry.entry_date) return;

    // Group by month (e.g. "2025-01")
    const date = entry.entry_date;
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const amount = Math.abs(Number(entry.credit) - Number(entry.debit));

    revenueByMonth.set(monthKey, (revenueByMonth.get(monthKey) || 0) + amount);
  });

  return Array.from(revenueByMonth.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, total]) => ({
      date: month, // "YYYY-MM"
      total,
      key: month,
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
  const items = await prisma.invoiceItem
    .groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      where: {
        companyId,
        invoice: {
          invoiceDate: {
            gte: startDate,
            lte: endDate,
          },
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
      account_type: { in: ["EXPENSE"] },
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
    const totalRaw = account.journal_entries.reduce(
      (sum, entry) => sum + Number(entry.debit) - Number(entry.credit),
      0,
    );

    // Round to 2 decimals to avoid floating errors
    const total = Math.round(totalRaw * 100) / 100;

    return {
      category: account.account_name_en.trim(),
      amount: total,
      percentage: 0,
    };
  });

  // Remove zero or near-zero categories
  const filtered = categoryTotals.filter((cat) => cat.amount > 0.01);

  const totalExpenses = filtered.reduce((sum, cat) => sum + cat.amount, 0);

  const chartData = filtered
    .map((cat, index) => ({
      id: index + 1,
      browser: cat.category,
      visitors: cat.amount,
      fill: `var(--chart-${(index % 5) + 1})`,
      percentage: ((cat.amount / totalExpenses) * 100).toFixed(1),
    }))
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, 5);

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
  const sales = await prisma.invoiceItem.count({
    where: { companyId: companyId },
  });

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
      totalDebts: salesOverview.totalDebt,
    },
    revenueChart,
    topProducts,
    sales,
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
        account_category: "INVENTORY",
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
        account_category: "ACCOUNTS_RECEIVABLE",
        is_active: true,
      },
      is_posted: true,
    },
    _sum: {
      debit: true,
      credit: true,
    },
  });

  const totalRevenue = Math.abs(
    Number(revenue._sum.credit || 0) - Number(revenue._sum.debit || 0),
  );

  const totalPurchases = Math.abs(
    Number(purchases._sum.debit || 0) - Number(purchases._sum.credit || 0),
  );

  const totalUnreceived = Math.abs(
    Number(unreceived._sum.debit || 0) - Number(unreceived._sum.credit || 0),
  );
  const netProfit = Math.abs(totalRevenue - totalPurchases);

  return {
    revenue: { total: totalRevenue },
    purchases: { total: totalPurchases },
    debt: { unreceived: totalUnreceived },
    netProfit,
  };
}

/**
 * Get Product Statistics
 */
// Helper to convert units to cartons
function convertToCartons(product: any, quantity: number) {
  const unitsPerPacket = product.unitsPerPacket || 1;
  const packetsPerCarton = product.packetsPerCarton || 1;

  const cartons = quantity / unitsPerPacket / packetsPerCarton;
  return Number(cartons.toFixed(2)); // round to 2 decimals
}

export async function getProductStats(companyId: string) {
  const now = new Date();
  const oneMonthLater = new Date();
  oneMonthLater.setMonth(now.getMonth() + 1);
  // 1️⃣ Fetch all inventory with product info
  const inventory = await prisma.inventory.findMany({
    where: { companyId },
    select: {
      stockQuantity: true,
      availableQuantity: true,
      reorderLevel: true,
      product: {
        select: {
          packetsPerCarton: true,
          unitsPerPacket: true,
          expiredAt: true,
        },
      },
    }, // need unitsPerPacket & packetsPerCarton
  });

  // 2️⃣ Convert quantities to cartons
  const convertedInventory = inventory.map((item) => {
    const stockCartons = convertToCartons(
      item.product,
      item.stockQuantity ?? 0,
    );
    const availableCartons = convertToCartons(
      item.product,
      item.availableQuantity ?? 0,
    );
    const expiryDate = item.product.expiredAt
      ? new Date(item.product.expiredAt)
      : null;

    return {
      ...item,
      stockCartons,
      availableCartons,
      isExpired: expiryDate ? expiryDate < now : false,
      isExpiringSoon: expiryDate
        ? expiryDate >= now && expiryDate <= oneMonthLater
        : false,
    };
  });
  // 3️⃣ Compute totals

  const lowStockCount = convertedInventory.filter(
    (item) => item.stockCartons <= (item.reorderLevel ?? 0),
  ).length;

  const zeroStockCount = convertedInventory.filter(
    (item) => item.stockCartons === 0,
  ).length;
  const expiredCount = convertedInventory.filter(
    (item) => item.isExpired,
  ).length;
  const expiringSoonCount = convertedInventory.filter(
    (item) => item.isExpiringSoon,
  ).length;

  return {
    totalexpiredCount: expiredCount,
    lowStockProducts: lowStockCount,
    zeroProducts: zeroStockCount,
    expiringSoonProducts: expiringSoonCount,
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
  filter?: Prisma.InvoiceWhereInput;
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
