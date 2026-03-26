"use server";

import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

function serializeData<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map((item) => serializeData(item)) as T;
  }

  const plainObj: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Prisma.Decimal) {
      plainObj[key] = value.toNumber();
    } else if (value instanceof Date) {
      plainObj[key] = value.toISOString();
    } else if (typeof value === "bigint") {
      plainObj[key] = value.toString();
    } else if (typeof value === "object" && value !== null) {
      plainObj[key] = serializeData(value);
    } else {
      plainObj[key] = value;
    }
  }

  return plainObj as T;
}

function getDayRange() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export async function getCashierDashboardData() {
  const session = await getSession();

  if (!session?.companyId || !session.userId) {
    return { success: false as const, error: "Unauthorized" };
  }

  const isAdmin = session.roles.includes("admin");
  const invoiceScope = isAdmin
    ? { companyId: session.companyId }
    : { companyId: session.companyId, cashierId: session.userId };
  const transactionScope = isAdmin
    ? { companyId: session.companyId }
    : { companyId: session.companyId, userId: session.userId };
  const { start, end } = getDayRange();
  const sevenDaysAgo = new Date(start);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const [
    todaySales,
    todayReceipts,
    recentSales,
    statusCounts,
    weeklySales,
    dueSales,
  ] = await Promise.all([
    prisma.invoice.aggregate({
      where: {
        ...invoiceScope,
        sale_type: "SALE",
        invoiceDate: { gte: start, lte: end },
      },
      _sum: { totalAmount: true, amountDue: true, amountPaid: true },
      _count: { id: true },
    }),
    prisma.financialTransaction.aggregate({
      where: {
        ...transactionScope,
        type: "RECEIPT",
        createdAt: { gte: start, lte: end },
      },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.invoice.findMany({
      where: {
        ...invoiceScope,
        sale_type: "SALE",
      },
      select: {
        id: true,
        invoiceNumber: true,
        totalAmount: true,
        amountPaid: true,
        amountDue: true,
        status: true,
        invoiceDate: true,
        customer: { select: { name: true } },
      },
      orderBy: { invoiceDate: "desc" },
      take: 6,
    }),
    Promise.all([
      prisma.invoice.count({
        where: {
          ...invoiceScope,
          sale_type: "SALE",
          invoiceDate: { gte: start, lte: end },
          status: "paid",
        },
      }),
      prisma.invoice.count({
        where: {
          ...invoiceScope,
          sale_type: "SALE",
          invoiceDate: { gte: start, lte: end },
          status: "partial",
        },
      }),
      prisma.invoice.count({
        where: {
          ...invoiceScope,
          sale_type: "SALE",
          invoiceDate: { gte: start, lte: end },
          status: "unpaid",
        },
      }),
    ]),
    prisma.invoice.findMany({
      where: {
        ...invoiceScope,
        sale_type: "SALE",
        invoiceDate: { gte: sevenDaysAgo, lte: end },
      },
      select: {
        invoiceDate: true,
        totalAmount: true,
      },
      orderBy: { invoiceDate: "asc" },
    }),
    prisma.invoice.findMany({
      where: {
        ...invoiceScope,
        sale_type: "SALE",
        amountDue: { gt: 0 },
      },
      select: {
        id: true,
        invoiceNumber: true,
        amountDue: true,
        invoiceDate: true,
        customer: { select: { name: true, phoneNumber: true } },
      },
      orderBy: [{ amountDue: "desc" }, { invoiceDate: "desc" }],
      take: 5,
    }),
  ]);

  const dailyMap = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const date = new Date(sevenDaysAgo);
    date.setDate(sevenDaysAgo.getDate() + i);
    dailyMap.set(date.toISOString().split("T")[0], 0);
  }

  weeklySales.forEach((sale) => {
    const key = sale.invoiceDate.toISOString().split("T")[0];
    dailyMap.set(
      key,
      (dailyMap.get(key) || 0) + Number(sale.totalAmount || 0),
    );
  });

  const salesTrend = Array.from(dailyMap.entries()).map(([date, total]) => ({
    date,
    total,
  }));

  return {
    success: true as const,
    data: serializeData({
      scope: isAdmin ? "company" : "cashier",
      todaySales,
      todayReceipts,
      recentSales,
      statusCounts: {
        paid: statusCounts[0],
        partial: statusCounts[1],
        unpaid: statusCounts[2],
      },
      salesTrend,
      dueSales,
    }),
  };
}
