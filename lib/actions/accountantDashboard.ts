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

export async function getAccountantDashboardData() {
  const session = await getSession();

  if (!session?.companyId) {
    return { success: false as const, error: "Unauthorized" };
  }

  const { start, end } = getDayRange();
  const sevenDaysAgo = new Date(start);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const [
    todayReceipts,
    todayPayments,
    voucherCount,
    postedJournalCount,
    draftJournalCount,
    recentVouchers,
    recentJournals,
    weeklyTransactions,
  ] = await Promise.all([
    prisma.financialTransaction.aggregate({
      where: {
        companyId: session.companyId,
        type: "RECEIPT",
        createdAt: { gte: start, lte: end },
      },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.financialTransaction.aggregate({
      where: {
        companyId: session.companyId,
        type: "PAYMENT",
        createdAt: { gte: start, lte: end },
      },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.financialTransaction.count({
      where: {
        companyId: session.companyId,
        createdAt: { gte: sevenDaysAgo, lte: end },
      },
    }),
    prisma.journalHeader.count({
      where: {
        companyId: session.companyId,
        status: "POSTED",
        entryDate: { gte: sevenDaysAgo, lte: end },
      },
    }),
    prisma.journalHeader.count({
      where: {
        companyId: session.companyId,
        status: "DRAFT",
        entryDate: { gte: sevenDaysAgo, lte: end },
      },
    }),
    prisma.financialTransaction.findMany({
      where: { companyId: session.companyId },
      select: {
        id: true,
        voucherNumber: true,
        type: true,
        amount: true,
        currencyCode: true,
        paymentMethod: true,
        createdAt: true,
        customer: { select: { name: true } },
        supplier: { select: { name: true } },
        invoice: { select: { invoiceNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.journalHeader.findMany({
      where: { companyId: session.companyId },
      select: {
        id: true,
        entryNumber: true,
        entryDate: true,
        description: true,
        status: true,
        createdUser: { select: { name: true } },
      },
      orderBy: { entryDate: "desc" },
      take: 5,
    }),
    prisma.financialTransaction.findMany({
      where: {
        companyId: session.companyId,
        createdAt: { gte: sevenDaysAgo, lte: end },
      },
      select: {
        type: true,
        amount: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const dailyMap = new Map<string, { receipts: number; payments: number }>();
  for (let i = 0; i < 7; i++) {
    const date = new Date(sevenDaysAgo);
    date.setDate(sevenDaysAgo.getDate() + i);
    dailyMap.set(date.toISOString().split("T")[0], { receipts: 0, payments: 0 });
  }

  weeklyTransactions.forEach((transaction) => {
    const key = transaction.createdAt.toISOString().split("T")[0];
    const current = dailyMap.get(key) || { receipts: 0, payments: 0 };
    const amount = Number(transaction.amount || 0);

    if (transaction.type === "RECEIPT") {
      current.receipts += amount;
    } else {
      current.payments += amount;
    }

    dailyMap.set(key, current);
  });

  const transactionTrend = Array.from(dailyMap.entries()).map(([date, values]) => ({
    date,
    receipts: values.receipts,
    payments: values.payments,
  }));

  return {
    success: true as const,
    data: serializeData({
      todayReceipts,
      todayPayments,
      voucherCount,
      postedJournalCount,
      draftJournalCount,
      recentVouchers,
      recentJournals,
      transactionTrend,
    }),
  };
}
