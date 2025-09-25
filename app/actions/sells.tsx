// app/actions/sales/getTopSellingProducts.ts
"use server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { SortingState } from "@tanstack/react-table";
import {
  subDays,
  startOfWeek,
  startOfMonth,
  startOfDay,
  endOfDay,
  format,
} from "date-fns";
import { unstable_cache } from "next/cache";
export async function FetchDebtSales(
  where?: Prisma.SaleWhereInput,
  searchQuery: string = "",
  from?: string,
  to?: string,
  page: number = 0, // 0-indexed page number
  pageSize: number = 5,
  sort?: SortingState,
) {
  console.log(pageSize);
  const combinedWhere: Prisma.SaleWhereInput = {
    ...where, // Existing filters (category, warehouse, etc.)
  };

  const orderBy = sort?.length
    ? { [sort[0].id]: sort[0].desc ? "desc" : "asc" }
    : { createdAt: "desc" as const };

  const fromatDate = from ? new Date(from).toISOString() : undefined;
  const toDate = to ? new Date(to).toISOString() : undefined;
  if (searchQuery) {
    ((combinedWhere.customer = {
      name: { contains: searchQuery, mode: "insensitive" },
    }),
      {
        customer: {
          phoneNumber: { contains: searchQuery, mode: "insensitive" },
        },
      },
      { paymentStatus: { contains: searchQuery, mode: "insensitive" } });
  }
  if (fromatDate || toDate) {
    combinedWhere.createdAt = {
      ...(fromatDate && {
        gte: fromatDate,
      }),
      ...(toDate && {
        lte: toDate,
      }),
    };
  }
  const debts = await prisma.sale.findMany({
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
    where: combinedWhere,
    skip: page * pageSize,
    take: pageSize,
    orderBy,
  });
  // await prisma.payment
  const serializedDebts = debts.map((sale) => ({
    ...sale,
    totalAmount: sale.totalAmount.toString(), // Convert Decimal to string
    amountPaid: sale.amountPaid.toString(), // Convert Decimal to string
    amountDue: sale.amountDue.toString(), // Convert Decimal to string
    saleDate: sale.saleDate.toISOString(),
    createdAt: sale.createdAt.toISOString(),
  }));

  return serializedDebts; // Return the transformed data
}
export async function fetchSalesSummary(
  role: string,
  filters?: {
    salesFrom?: string;
    salesTo?: string;
    purchasesFrom?: string;
    purchasesTo?: string;
    revenueFrom?: string;
    revenueTo?: string;
    debtFrom?: string;
    debtTo?: string;
    chartTo?: string;
    chartFrom?: string;
    allFrom?: string;
    allTo?: string;
  },
) {
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

  // Run queries in parallel
  const [
    totalSalesAgg,
    salesOverTime,
    totalPurchasesAgg,
    purchasesOverTime,
    totalRevenueAgg,
    revenueOverTime,
    totalDebtAgg,
    debtPaymentsAgg,
    debtOverTime,
  ] = await Promise.all([
    prisma.sale.aggregate({
      _count: { id: true },
      where: { saleDate: salesRange, status: "completed" },
    }),
    prisma.sale.groupBy({
      by: ["saleDate"],
      _sum: { totalAmount: true },
      where: { saleDate: salesRange, status: "completed" },
      orderBy: { saleDate: "asc" },
    }),
    prisma.product.aggregate({
      _sum: { costPrice: true },
      where: { createdAt: purchasesRange },
    }),
    prisma.product.groupBy({
      by: ["createdAt"],
      _sum: { costPrice: true },
      where: { createdAt: purchasesRange },
      orderBy: { createdAt: "asc" },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { createdAt: revenueRange, status: "completed" },
    }),
    prisma.payment.groupBy({
      by: ["createdAt"],
      _sum: { amount: true },
      where: { createdAt: revenueRange, status: "completed" },
      orderBy: { createdAt: "asc" },
    }),
    prisma.sale.aggregate({
      _sum: { amountDue: true },
      where: { saleDate: debtRange },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      _count: { id: true },
      where: {
        createdAt: debtRange,
        paymentType: { in: ["outstanding_payment"] },
        status: "completed",
      },
    }),
    prisma.payment.groupBy({
      by: ["createdAt"],
      _sum: { amount: true },
      where: {
        createdAt: debtRange,
        paymentType: { in: ["outstanding_payment"] },
        status: "completed",
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const salesChart = salesOverTime.map((s) => ({
    date: s.saleDate.toISOString().split("T")[0],
    value: s._sum.totalAmount?.toNumber() || 0,
  }));
  const purchasesChart = purchasesOverTime.map((p) => ({
    date: p.createdAt.toISOString().split("T")[0],
    value: p._sum.costPrice?.toNumber() || 0,
  }));
  const revenueChart = revenueOverTime.map((r) => ({
    date: r.createdAt.toISOString().split("T")[0],
    value: r._sum.amount?.toNumber() || 0,
  }));
  const debtChart = debtOverTime.map((d) => ({
    date: d.createdAt.toISOString().split("T")[0],
    value: d._sum.amount?.toNumber() || 0,
  }));

  return {
    sales: { total: totalSalesAgg._count.id, chart: salesChart },
    purchases: {
      total: totalPurchasesAgg._sum.costPrice?.toNumber() || 0,
      chart: purchasesChart,
    },
    revenue: {
      total: totalRevenueAgg._sum.amount?.toNumber() || 0,
      chart: revenueChart,
    },
    debt: {
      totalDebt: totalDebtAgg._sum.amountDue?.toNumber() || 0,
      received: debtPaymentsAgg._sum.amount?.toNumber() || 0,
      chart: debtChart,
    },
  };
}

export async function fetchProductStats(role: string) {
  let totalStockQuantity = null;

  if (role === "admin") {
    const stock = await prisma.inventory.aggregate({
      _sum: { stockQuantity: true },
    });
    totalStockQuantity = stock._sum.stockQuantity || 0;
  }

  // Raw SQL for comparing two fields
  const result = await prisma.$queryRawUnsafe<{ count: number }[]>(`
  SELECT COUNT(*) as count
  FROM "inventory"
  WHERE  "reorder_level">="stock_quantity"
  `);
  const z = 0;
  const finished = await prisma.$queryRawUnsafe<{ count: number }[]>(`
  SELECT COUNT(*) as count
  FROM "inventory"
  WHERE "stock_quantity" = ${z}
  `);
  // Get detailed low stock products for notifications
  const lowStockDetails = await prisma.$queryRaw<
    Array<{
      product_id: string;
      stock_quantity: number;
      reorder_level: number;
      product_name: string;
    }>
  >`
    SELECT 
      i."product_id",
      i."stock_quantity",
      i."reorder_level",
      p."name" as product_name
    FROM "inventory" i
    JOIN "products" p ON i."product_id" = p."id"
    WHERE i."reorder_level" >= i."stock_quantity"
    ORDER BY i."stock_quantity" ASC
   
  `;

  const lowStockProducts = result[0]?.count || 0;
  const zeroProducts = finished[0]?.count || 0;

  return {
    totalStockQuantity,
    lowStockProducts,
    zeroProducts,
    lowStockDetails,
  };
}

export async function Fetchusers(isActive: boolean) {
  // let totalUser;
  const users = await prisma.user.aggregate({
    _count: { id: true },
    where: {
      isActive: isActive,
    },
  });
  return {
    users: users._count.id,
  };
}

export async function getTopSellingProducts(
  limit = 5,

  from?: string,
  to?: string,
  categoryId?: string,
) {
  let dateFilter: any = {}; // Object to hold date filtering conditions

  if (from) {
    // For a date range, query from the very beginning of the start day
    dateFilter.gte = startOfDay(from); // Greater than or equal to
  }

  if (to) {
    // For a date range, query up to the very end of the end day
    dateFilter.lte = endOfDay(to); // Less than or equal to
  }

  const saleItems = await prisma.saleItem.findMany({
    where: {
      createdAt: {
        ...dateFilter,
      },
      ...(categoryId && {
        product: {
          is: {
            categoryId,
          },
        },
      }),
    },
    select: {
      productId: true,
      quantity: true,
      product: {
        select: {
          name: true,
          categoryId: true,
        },
      },
    },
  });

  const grouped = saleItems.reduce<
    Record<string, { name: string; quantity: number }>
  >((acc, item) => {
    const name = item.product.name ?? "Unknown";
    acc[item.productId] = acc[item.productId] || { name, quantity: 0 };
    acc[item.productId].quantity += item.quantity;
    return acc;
  }, {});

  const sorted = Object.values(grouped)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);

  return sorted;
}

export async function fetchrevnu(from?: string, to?: string, groupBy?: string) {
  let dateFilter: any = {};

  if (from) {
    dateFilter.gte = startOfDay(new Date(from));
  }

  if (to) {
    dateFilter.lte = endOfDay(new Date(to));
  }

  // Fetch payments
  const payments = await prisma.payment.findMany({
    where: {
      createdAt: {
        ...dateFilter,
      },
    },
    select: {
      amount: true, // Prisma.Decimal
      createdAt: true,
    },
  });

  // Group by day or month
  const grouped = payments.reduce<
    Record<string, { date: string; total: number }>
  >((acc, payment) => {
    const key =
      groupBy === "month"
        ? format(payment.createdAt, "MM").toLocaleString()
        : format(payment.createdAt, "yyyy-MM");
    const formattedDate = new Date(key).toLocaleDateString("ar-EG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    if (!acc[key]) {
      acc[key] = { date: formattedDate, total: 0 };
    }

    // Convert Prisma.Decimal → number
    acc[key].total += Number(payment.amount);

    return acc;
  }, {});

  // Instead of returning the object
  const sort = Object.values(grouped).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  return sort;
}
