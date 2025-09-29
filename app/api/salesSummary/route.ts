// import { getActivityLogs } from "@/app/actions/activitylogs";
// import {
//   fetchSalesSummary,
//   fetchProductStats,
//   Fetchusers,
//   FetchDebtSales,
// } from "@/app/actions/sells";
// import { fetchrevnu, getTopSellingProducts } from "@/app/actions/sells";
// import { NextRequest, NextResponse } from "next/server";

// function serializeBigInt(obj: any): any {
//   if (obj === null || obj === undefined) {
//     return obj;
//   }

//   if (typeof obj === "bigint") {
//     return obj.toString();
//   }

//   if (Array.isArray(obj)) {
//     return obj.map(serializeBigInt);
//   }

//   if (typeof obj === "object") {
//     const serialized: any = {};
//     for (const key in obj) {
//       if (obj.hasOwnProperty(key)) {
//         serialized[key] = serializeBigInt(obj[key]);
//       }
//     }
//     return serialized;
//   }

//   return obj;
// }
// import { ParsedSort } from "@/hooks/sort";
// import { Prisma } from "@prisma/client";
// import { fetchAllFormData } from "@/app/actions/roles";

// export async function GET(req: NextRequest) {
//   const searchParams = req.nextUrl.searchParams;

//   // Extract all parameters with defaults
//   const from = searchParams.get("from") || "";
//   const to = searchParams.get("to") || "";
//   const categoryId = searchParams.get("categoryId") || "";
//   const query = searchParams.get("query") || "";
//   const page = searchParams.get("page") || "1";
//   const limit = searchParams.get("limit") || "7";

//   const salesFrom = searchParams.get("salesFrom") || undefined;
//   const salesTo = searchParams.get("salesTo") || undefined;
//   const purchasesFrom = searchParams.get("purchasesFrom") ?? undefined;
//   const purchasesTo = searchParams.get("purchasesTo") || undefined;
//   const revenueFrom = searchParams.get("revenueFrom") || undefined;
//   const revenueTo = searchParams.get("revenueTo") || undefined;
//   const debtFrom = searchParams.get("debtFrom") || undefined;
//   const debtTo = searchParams.get("debtTo") || undefined;
//   const chartFrom = searchParams.get("chartFrom") ?? undefined;
//   const chartTo = searchParams.get("chartTo") || undefined;
//   const allFrom = searchParams.get("allFrom") || undefined;
//   const allTo = searchParams.get("allTo") || undefined;
//   const sort = searchParams.get("sort") || "";
//   const revnue = searchParams.get("revnueDate") || undefined;
//   const topItems = searchParams.get("topItems") || "5";
//   // Process pagination
//   const pageIndex = Number(page) - 1;
//   const pageSize = Number(limit);

//   // Combine filters
//   const filters = {
//     salesFrom,
//     salesTo,
//     purchasesFrom,
//     purchasesTo,
//     revenueFrom,
//     revenueTo,
//     debtFrom,
//     debtTo,
//     chartFrom,
//     chartTo,
//     allFrom,
//     allTo,
//   };

//   // Parse sort
//   const parsedSort = ParsedSort(sort);

//   // Create filter for debt sales
//   const filter: Prisma.SaleWhereInput = {
//     // Add your filter logic here if needed
//   };

//   try {
//     // Single comprehensive data fetch
//     console.time("api");
//     const [recentSales, topProducts, activityLogs, formData, revenue] =
//       await Promise.all([
//         FetchDebtSales(
//           filter,
//           query,
//           from,
//           to,
//           pageIndex,
//           pageSize,
//           parsedSort,
//         ),
//         getTopSellingProducts(Number(topItems), from, to, categoryId),
//         getActivityLogs(pageIndex, pageSize, parsedSort),
//         fetchAllFormData(),
//         fetchrevnu(allFrom, allTo, "day", Number(topItems)),
//       ]);

//     // Combine chart data here to avoid duplication

//     // Serialize all data to handle BigInt
//     const responseData = serializeBigInt({
//       revenue,

//       recentSales,
//       topProducts,
//       activityLogs,

//       formData,

//       pagination: {
//         page: pageIndex + 1,
//         limit: pageSize,
//         total: recentSales.length,
//       },
//     });

//     return NextResponse.json(responseData);
//   } catch (error) {
//     console.error("Dashboard API Error:", error);
//     return NextResponse.json(
//       {
//         error: "Failed to fetch dashboard data",
//         details: error instanceof Error ? error.message : "Unknown error",
//       },
//       { status: 500 },
//     );
//   }
// }
// app/api/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // adjust path to your prisma client
import { subDays } from "date-fns";

// Helper to convert BigInt/Decimal to numbers
const serializeBigInt = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "bigint") return Number(obj);
  if (typeof obj === "object") {
    for (const key in obj) {
      obj[key] = serializeBigInt(obj[key]);
    }
  }
  return obj;
};

const groupByDay = (data: any[], dateField: string) => {
  const grouped = new Map<string, number>();
  data.forEach((item) => {
    const date = item[dateField].toISOString().split("T")[0];
    const rawValue = item._sum ? Object.values(item._sum)[0] : 0;
    const value = rawValue !== undefined ? Number(rawValue) : 0;
    grouped.set(date, (grouped.get(date) || 0) + value);
  });
  return Array.from(grouped.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 30);
};

const groupByMonth = (data: any[], dateField: string) => {
  const grouped = new Map<string, number>();
  data.forEach((item) => {
    const dateObj = item[dateField];
    const monthKey = `${dateObj.getFullYear()}-${String(
      dateObj.getMonth() + 1,
    ).padStart(2, "0")}`;
    const rawValue = item._sum ? Object.values(item._sum)[0] : 0;
    const value = rawValue !== undefined ? Number(rawValue) : 0;
    grouped.set(monthKey, (grouped.get(monthKey) || 0) + value);
  });
  return Array.from(grouped.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

export async function POST(req: NextRequest) {
  const { role, filters, pagination } = await req.json();

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

  const [
    salesAgg,
    salesGrouped,
    purchasesAgg,
    purchasesGrouped,
    revenueAgg,
    revenueGrouped,
    debtUnreceivedAgg,
    debtReceivedAgg,
    debtUnreceivedGrouped,
    debtReceivedGrouped,
    productStats,
    userCount,
    topProducts,
    recentSales,
    activityLogs,
  ] = await Promise.all([
    prisma.sale.aggregate({
      _sum: { totalAmount: true },
      _count: { id: true },
      where: { saleDate: salesRange, status: "completed" },
    }),
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
    prisma.product.aggregate({
      _sum: { costPrice: true },
      where: { createdAt: purchasesRange },
    }),
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
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { createdAt: revenueRange, status: "completed" },
    }),
    prisma.payment.groupBy({
      by: ["createdAt"],
      _sum: { amount: true },
      where: {
        createdAt: {
          ...revenueRange,
          gte: revenueRange.gte || subDays(new Date(), 30),
        },
        status: "completed",
      },
      orderBy: { createdAt: "asc" },
      take: 30,
    }),
    prisma.sale.aggregate({
      _sum: { amountDue: true },
      where: {
        saleDate: debtRange,
        paymentStatus: { in: ["partial", "pending"] },
      },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        createdAt: debtRange,
        paymentType: "outstanding_payment",
        status: "completed",
      },
    }),
    prisma.sale.groupBy({
      by: ["saleDate"],
      _sum: { amountDue: true },
      where: {
        saleDate: debtRange,
        paymentStatus: { in: ["partial", "pending"] },
      },
      orderBy: { saleDate: "asc" },
    }),
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
    role === "admin"
      ? prisma.inventory
          .aggregate({ _sum: { stockQuantity: true } })
          .then(async (stock) => {
            const [lowStockCount, zeroStockCount] = await Promise.all([
              prisma.inventory.count({
                where: {
                  stockQuantity: { lte: prisma.inventory.fields.reorderLevel },
                },
              }),
              prisma.inventory.count({ where: { stockQuantity: 0 } }),
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
    prisma.user.count({ where: { isActive: true } }),
    prisma.saleItem
      .groupBy({
        by: ["productId"],
        _sum: { quantity: true },
        where: { createdAt: { gte: subDays(new Date(), 30) } },
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
              select: { name: true, phoneNumber: true, customerType: true },
            },
          },
          where: pagination.query
            ? {
                OR: [
                  {
                    customer: {
                      name: { contains: pagination.query, mode: "insensitive" },
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
    pagination
      ? prisma.activityLogs.findMany({
          include: { user: { select: { name: true } } },
          skip: (pagination.page || 0) * (pagination.pageSize || 5),
          take: pagination.pageSize || 5,
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  return NextResponse.json(
    serializeBigInt({
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
    }),
  );
}
