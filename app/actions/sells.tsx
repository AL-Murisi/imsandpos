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
  page: number = 1, // 0-indexed page number
  pageSize: number = 7,
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
    combinedWhere.OR = [
      { customer: { name: { contains: searchQuery, mode: "insensitive" } } },
      {
        customer: {
          phoneNumber: { contains: searchQuery, mode: "insensitive" },
        },
      },
      { paymentStatus: { contains: searchQuery, mode: "insensitive" } },
    ];
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
export async function FetchCustomerDebtReport(customerId: string) {
  const sales = await prisma.sale.findMany({
    where: {
      customerId,
      paymentStatus: { in: ["pending", "partial"] },
    },
    select: {
      id: true,
      saleNumber: true,
      totalAmount: true,
      amountPaid: true,
      amountDue: true,
      saleDate: true,
      paymentStatus: true,
      saleItems: {
        select: {
          id: true,
          product: { select: { name: true, sku: true } },
          quantity: true,
          sellingUnit: true,
          unitPrice: true,
          totalPrice: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return sales.map((sale) => ({
    ...sale,
    totalAmount: sale.totalAmount.toString(),
    amountPaid: sale.amountPaid.toString(),
    amountDue: sale.amountDue.toString(),
    saleDate: sale.saleDate.toISOString(),
    saleItems: sale.saleItems.map((item) => ({
      ...item,
      unitPrice: item.unitPrice.toString(),
      totalPrice: item.totalPrice.toString(),
    })),
  }));
}

// export async function fetchSalesSummary(
//   role: string,
//   filters?: {
//     salesFrom?: string;
//     salesTo?: string;
//     purchasesFrom?: string;
//     purchasesTo?: string;
//     revenueFrom?: string;
//     revenueTo?: string;
//     debtFrom?: string;
//     debtTo?: string;
//     chartTo?: string;
//     chartFrom?: string;
//     allFrom?: string;
//     allTo?: string;
//   },
// ) {
//   const formatRange = (from?: string, to?: string) => ({
//     ...(from ? { gte: new Date(from) } : {}),
//     ...(to ? { lte: new Date(to) } : {}),
//   });

//   const salesRange = formatRange(
//     filters?.salesFrom || filters?.allFrom,
//     filters?.salesTo || filters?.allTo,
//   );
//   const purchasesRange = formatRange(
//     filters?.purchasesFrom || filters?.allFrom,
//     filters?.purchasesTo || filters?.allTo,
//   );
//   const revenueRange = formatRange(
//     filters?.revenueFrom || filters?.allFrom,
//     filters?.revenueTo || filters?.allTo,
//   );
//   const debtRange = formatRange(
//     filters?.debtFrom || filters?.allFrom,
//     filters?.debtTo || filters?.allTo,
//   );

//   // Reduced from 9 queries to 4 queries by combining aggregate + groupBy
//   const [salesOverTime, purchasesOverTime, revenueOverTime, debtData] =
//     await Promise.all([
//       // Query 1: Sales (combines count + groupBy)
//       prisma.sale.groupBy({
//         by: ["saleDate"],
//         _sum: { totalAmount: true },
//         _count: { id: true },
//         where: { saleDate: salesRange, status: "completed" },
//         orderBy: { saleDate: "asc" },
//       }),

//       // Query 2: Purchases (groupBy includes sum)
//       prisma.product.groupBy({
//         by: ["createdAt"],
//         _sum: { costPrice: true },
//         where: { createdAt: purchasesRange },
//         orderBy: { createdAt: "asc" },
//       }),

//       // Query 3: Revenue (groupBy includes sum)
//       prisma.payment.groupBy({
//         by: ["createdAt"],
//         _sum: { amount: true },
//         where: { createdAt: revenueRange, status: "completed" },
//         orderBy: { createdAt: "asc" },
//       }),

//       // Query 4: Debt data (combined into single query)
//       prisma.$transaction([
//         // Total debt
//         prisma.sale.aggregate({
//           _sum: { amountDue: true },
//           where: { saleDate: debtRange },
//         }),
//         // Debt payments over time (includes total)
//         prisma.payment.groupBy({
//           by: ["createdAt"],
//           _sum: { amount: true },
//           _count: { id: true },
//           where: {
//             createdAt: debtRange,
//             paymentType: { in: ["outstanding_payment"] },
//             status: "completed",
//           },
//           orderBy: { createdAt: "asc" },
//         }),
//       ]),
//     ]);

//   // Extract debt data from transaction
//   const [totalDebtAgg, debtPaymentsOverTime] = debtData;

//   // Calculate totals from grouped data (avoiding redundant aggregate queries)
//   const totalSales = salesOverTime.reduce(
//     (sum, s) => sum + (s._count.id || 0),
//     0,
//   );
//   const totalPurchases = purchasesOverTime.reduce(
//     (sum, p) => sum + (p._sum?.costPrice?.toNumber() || 0),
//     0,
//   );
//   const totalRevenue = revenueOverTime.reduce(
//     (sum, r) => sum + (r._sum?.amount?.toNumber() || 0),
//     0,
//   );
//   const totalDebtReceived = debtPaymentsOverTime.reduce(
//     (sum, d) => sum + (d._sum?.amount?.toNumber() || 0),
//     0,
//   );

//   // Format chart data - group by day to reduce data points
//   const groupByDay = (data: any[], dateField: string, valueField: string) => {
//     const grouped = new Map<string, number>();

//     data.forEach((item) => {
//       const date = item[dateField].toISOString().split("T")[0];
//       const value = item._sum?.[valueField]?.toNumber() || 0;
//       grouped.set(date, (grouped.get(date) || 0) + value);
//     });

//     return Array.from(grouped.entries())
//       .map(([date, value]) => ({ date, value }))
//       .sort((a, b) => a.date.localeCompare(b.date));
//   };

//   const salesChart = groupByDay(salesOverTime, "saleDate", "totalAmount");
//   const purchasesChart = groupByDay(
//     purchasesOverTime,
//     "createdAt",
//     "costPrice",
//   );
//   const revenueChart = groupByDay(revenueOverTime, "createdAt", "amount");
//   const debtChart = groupByDay(debtPaymentsOverTime, "createdAt", "amount");

//   return {
//     sales: {
//       total: totalSales,
//       chart: salesChart,
//     },
//     purchases: {
//       total: totalPurchases,
//       chart: purchasesChart,
//     },
//     revenue: {
//       total: totalRevenue,
//       chart: revenueChart,
//     },
//     debt: {
//       totalDebt: totalDebtAgg._sum.amountDue?.toNumber() || 0,
//       received: totalDebtReceived,
//       chart: debtChart,
//     },
//   };
// }
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

  const [salesOverTime, purchasesOverTime, revenueOverTime, debtData] =
    await Promise.all([
      prisma.sale.groupBy({
        by: ["saleDate"],
        _sum: { totalAmount: true },
        _count: { id: true },
        where: { saleDate: salesRange, status: "completed" },
        orderBy: { saleDate: "asc" },
      }),

      prisma.product.groupBy({
        by: ["createdAt"],
        _sum: { costPrice: true },
        where: { createdAt: purchasesRange },
        orderBy: { createdAt: "asc" },
      }),

      prisma.payment.groupBy({
        by: ["createdAt"],
        _sum: { amount: true },
        where: { createdAt: revenueRange, status: "completed" },
        orderBy: { createdAt: "asc" },
      }),

      prisma.$transaction([
        // 🔹 Outstanding debt (from sales still unpaid/partially paid)
        prisma.sale.aggregate({
          _sum: { amountDue: true },
          where: {
            saleDate: debtRange,
            paymentStatus: { in: ["partial", "pending"] },
          },
        }),
        // 🔹 Received debt payments
        prisma.payment.aggregate({
          _sum: { amount: true },
          where: {
            createdAt: debtRange,
            paymentType: "outstanding_payment",
            status: "completed",
          },
        }),
        // Group outstanding (unreceived) by month
        prisma.sale.groupBy({
          by: ["saleDate"],
          _sum: { amountDue: true },
          where: {
            saleDate: debtRange,
            paymentStatus: { in: ["partial", "pending"] },
          },
          orderBy: { saleDate: "asc" },
        }),
        // Group received debt by month
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
      ]),
    ]);

  const [
    totalUnreceivedAgg,
    totalReceivedAgg,
    unreceivedOverTime,
    receivedOverTime,
  ] = debtData;

  const totalSales = salesOverTime.reduce(
    (sum, s) => sum + (s._count.id || 0),
    0,
  );
  const totalPurchases = purchasesOverTime.reduce(
    (sum, p) => sum + (p._sum?.costPrice?.toNumber() || 0),
    0,
  );
  const totalRevenue = revenueOverTime.reduce(
    (sum, r) => sum + (r._sum?.amount?.toNumber() || 0),
    0,
  );

  const totalUnreceived = totalUnreceivedAgg._sum.amountDue?.toNumber() || 0;
  const totalReceived = totalReceivedAgg._sum.amount?.toNumber() || 0;

  // Group by month
  const groupByMonth = (data: any[], dateField: string, valueField: string) => {
    const grouped = new Map<string, number>();
    data.forEach((item) => {
      const dateObj = item[dateField];
      const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
      const value = item._sum?.[valueField]?.toNumber() || 0;
      grouped.set(monthKey, (grouped.get(monthKey) || 0) + value);
    });
    return Array.from(grouped.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

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

  const unreceivedChart = groupByMonth(
    unreceivedOverTime,
    "saleDate",
    "amountDue",
  );
  const receivedChart = groupByMonth(receivedOverTime, "createdAt", "amount");

  return {
    sales: {
      total: totalSales,
      chart: salesChart,
    },
    purchases: {
      total: totalPurchases,
      chart: purchasesChart,
    },
    revenue: {
      total: totalRevenue,
      chart: revenueChart,
    },
    debt: {
      unreceived: totalUnreceived, // 💡 From Sale.amountDue
      received: totalReceived, // 💡 From Payment.amount
      unreceivedChart, // monthly chart from Sale
      receivedChart, // monthly chart from Payment
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

export async function fetchrevnu(
  from?: string,
  to?: string,

  groupBy: "day" | "month" = "day",
  limit = 5,
) {
  const dateFilter: any = {};
  if (from) dateFilter.gte = startOfDay(new Date(from));
  if (to) dateFilter.lte = endOfDay(new Date(to));

  // Use Prisma groupBy to let DB do aggregation
  const paymentsGrouped = await prisma.payment.groupBy({
    by: ["createdAt"],
    _sum: { amount: true },
    where: { createdAt: dateFilter },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  // Map results to your formatted structure
  const formatted = paymentsGrouped.map((p) => {
    const key =
      groupBy === "month"
        ? format(p.createdAt, "yyyy-MM") // Group by month
        : format(p.createdAt, "yyyy-MM-dd"); // Group by day

    const formattedDate = new Date(p.createdAt).toLocaleDateString("ar-EG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    return {
      date: formattedDate,
      total: p._sum.amount?.toNumber() || 0,
      key,
    };
  });

  // Sort by date (optional, should already be sorted)
  return formatted.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}
// app/actions/dashboard.ts - OPTIMIZED

// 🚀 SINGLE OPTIMIZED FUNCTION - replaces all separate calls
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

    // 🔥 SINGLE DATABASE TRANSACTION - All queries in parallel
    const [
      salesData,
      purchasesData,
      revenueData,
      debtData,
      productStats,
      userCount,
      topProducts,
      recentSales,
    ] = await Promise.all([
      // Sales summary + chart
      prisma.$transaction([
        prisma.sale.aggregate({
          _sum: { totalAmount: true },
          _count: { id: true },
          where: { saleDate: salesRange, status: "completed" },
        }),
        prisma.$queryRaw<Array<{ date: string; value: number }>>`
          SELECT 
            DATE("saleDate") as date,
            SUM("totalAmount")::float as value
          FROM "Sale"
          WHERE "status" = 'completed'
            ${salesRange.gte ? Prisma.sql`AND "saleDate" >= ${salesRange.gte}` : Prisma.empty}
            ${salesRange.lte ? Prisma.sql`AND "saleDate" <= ${salesRange.lte}` : Prisma.empty}
          GROUP BY DATE("saleDate")
          ORDER BY date ASC
          LIMIT 30
        `,
      ]),

      // Purchases summary + chart
      prisma.$transaction([
        prisma.product.aggregate({
          _sum: { costPrice: true },
          where: { createdAt: purchasesRange },
        }),
        prisma.$queryRaw<Array<{ date: string; value: number }>>`
          SELECT 
            DATE("createdAt") as date,
            SUM("costPrice")::float as value
          FROM "Product"
          WHERE 1=1
            ${purchasesRange.gte ? Prisma.sql`AND "createdAt" >= ${purchasesRange.gte}` : Prisma.empty}
            ${purchasesRange.lte ? Prisma.sql`AND "createdAt" <= ${purchasesRange.lte}` : Prisma.empty}
          GROUP BY DATE("createdAt")
          ORDER BY date ASC
          LIMIT 30
        `,
      ]),

      // Revenue summary + chart
      prisma.$transaction([
        prisma.payment.aggregate({
          _sum: { amount: true },
          where: { createdAt: revenueRange, status: "completed" },
        }),
        prisma.$queryRaw<Array<{ date: string; value: number }>>`
          SELECT 
            DATE("createdAt") as date,
            SUM("amount")::float as value
          FROM "Payment"
          WHERE "status" = 'completed'
            ${revenueRange.gte ? Prisma.sql`AND "createdAt" >= ${revenueRange.gte}` : Prisma.empty}
            ${revenueRange.lte ? Prisma.sql`AND "createdAt" <= ${revenueRange.lte}` : Prisma.empty}
          GROUP BY DATE("createdAt")
          ORDER BY date ASC
          LIMIT 30
        `,
      ]),

      // Debt data (all in one transaction)
      prisma.$transaction([
        // Outstanding debt
        prisma.sale.aggregate({
          _sum: { amountDue: true },
          where: {
            saleDate: debtRange,
            paymentStatus: { in: ["partial", "pending"] },
          },
        }),
        // Received debt
        prisma.payment.aggregate({
          _sum: { amount: true },
          where: {
            createdAt: debtRange,
            paymentType: "outstanding_payment",
            status: "completed",
          },
        }),
        // Unreceived chart (monthly)
        prisma.$queryRaw<Array<{ date: string; value: number }>>`
          SELECT 
            TO_CHAR("saleDate", 'YYYY-MM') as date,
            SUM("amountDue")::float as value
          FROM "Sale"
          WHERE "paymentStatus" IN ('partial', 'pending')
            ${debtRange.gte ? Prisma.sql`AND "saleDate" >= ${debtRange.gte}` : Prisma.empty}
            ${debtRange.lte ? Prisma.sql`AND "saleDate" <= ${debtRange.lte}` : Prisma.empty}
          GROUP BY TO_CHAR("saleDate", 'YYYY-MM')
          ORDER BY date ASC
        `,
        // Received chart (monthly)
        prisma.$queryRaw<Array<{ date: string; value: number }>>`
          SELECT 
            TO_CHAR("createdAt", 'YYYY-MM') as date,
            SUM("amount")::float as value
          FROM "Payment"
          WHERE "paymentType" = 'outstanding_payment' AND "status" = 'completed'
            ${debtRange.gte ? Prisma.sql`AND "createdAt" >= ${debtRange.gte}` : Prisma.empty}
            ${debtRange.lte ? Prisma.sql`AND "createdAt" <= ${debtRange.lte}` : Prisma.empty}
          GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
          ORDER BY date ASC
        `,
      ]),

      // Product stats (optimized with single query)
      role === "admin"
        ? prisma.$queryRaw<
            Array<{
              totalStock: number;
              lowStock: number;
              zeroStock: number;
            }>
          >`
        SELECT 
          SUM("stock_quantity")::int as "totalStock",
          COUNT(CASE WHEN "reorder_level" >= "stock_quantity" THEN 1 END)::int as "lowStock",
          COUNT(CASE WHEN "stock_quantity" = 0 THEN 1 END)::int as "zeroStock"
        FROM "inventory"
      `
        : Promise.resolve([{ totalStock: 0, lowStock: 0, zeroStock: 0 }]),

      // User count
      prisma.user.count({ where: { isActive: true } }),

      // Top selling products (optimized)
      prisma.$queryRaw<
        Array<{
          name: string;
          quantity: number;
        }>
      >`
        SELECT 
          p."name",
          SUM(si."quantity")::int as quantity
        FROM "SaleItem" si
        JOIN "Product" p ON si."productId" = p."id"
        WHERE si."createdAt" >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY p."id", p."name"
        ORDER BY quantity DESC
        LIMIT 5
      `,

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
    ]);

    // Extract and format data
    const [salesAgg, salesChart] = salesData;
    const [purchasesAgg, purchasesChart] = purchasesData;
    const [revenueAgg, revenueChart] = revenueData;
    const [debtUnreceivedAgg, debtReceivedAgg, unreceivedChart, receivedChart] =
      debtData;
    const productStatsResult = Array.isArray(productStats)
      ? productStats[0]
      : productStats;

    // Format chart data
    const formatChartData = (data: Array<{ date: string; value: number }>) =>
      data.map((item) => ({
        date: item.date,
        value: item.value || 0,
      }));

    return {
      sales: {
        total: salesAgg._count.id || 0,
        chart: formatChartData(salesChart),
      },
      purchases: {
        total: purchasesAgg._sum.costPrice?.toNumber() || 0,
        chart: formatChartData(purchasesChart),
      },
      revenue: {
        total: revenueAgg._sum.amount?.toNumber() || 0,
        chart: formatChartData(revenueChart),
      },
      debt: {
        unreceived: debtUnreceivedAgg._sum.amountDue?.toNumber() || 0,
        received: debtReceivedAgg._sum.amount?.toNumber() || 0,
        unreceivedChart: formatChartData(unreceivedChart),
        receivedChart: formatChartData(receivedChart),
      },
      productStats: {
        totalStockQuantity: productStatsResult?.totalStock || 0,
        lowStockProducts: productStatsResult?.lowStock || 0,
        zeroProducts: productStatsResult?.zeroStock || 0,
      },
      users: { users: userCount },
      topProducts,
      recentSales: recentSales.map((sale) => ({
        ...sale,
        totalAmount: sale.totalAmount.toString(),
        amountPaid: sale.amountPaid.toString(),
        amountDue: sale.amountDue.toString(),
        saleDate: sale.saleDate.toISOString(),
        createdAt: sale.createdAt.toISOString(),
      })),
    };
  },
  ["dashboard-data"],
  {
    revalidate: 300, // Cache for 5 minutes
    tags: ["dashboard"],
  },
);
