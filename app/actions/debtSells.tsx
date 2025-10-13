"use server";
import prisma from "@/lib/prisma";
import Product from "../inventory/products/page";
import { revalidatePath } from "next/cache";
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { Prisma } from "@prisma/client";
import { create } from "domain";
import type { SortingState } from "@tanstack/react-table";
import { fetchProductStats } from "./sells";

// export async function fetchrecentSales() {
//   const today = new Date();
//   const startOfToday = startOfDay(today);
//   const endOfToday = endOfDay(today);
//   const startofWeek = startOfWeek(today);
//   const endoFWeek = endOfWeek(today);
//   const startOfThisMonth = startOfMonth(today);
//   const endOfThisMonth = endOfMonth(today);
//   const recentSales = await prisma.sale.findMany({
//     // where: {
//     //   createdAt: {
//     //     gte: startOfToday,
//     //     lte: endOfToday,
//     //   },
//     // },
//     select: {
//       id: true,
//       totalAmount: true,
//       amountPaid: true,
//       amountDue: true,
//       saleDate: true,
//       createdAt: true,
//       paymentStatus: true,
//       customer: {
//         select: {
//           name: true,
//           phoneNumber: true,
//         },
//       },
//     },
//   });
//   const serializedDebt = recentSales.map((sale) => ({
//     ...sale,
//     totalAmount: sale.totalAmount.toString(), // Convert Decimal to string
//     amountPaid: sale.amountPaid.toString(), // Convert Decimal to string
//     amountDue: sale.amountDue.toString(), // Convert Decimal to string

//     saleDate: sale.saleDate.toISOString(),
//     createdAt: sale.createdAt.toISOString(),
//   }));
//   return serializedDebt;
// }
export async function updateSales(
  saleId: string,
  paymentAmount: number,
  cashierId?: string,
) {
  // Input validation for paymentAmount
  if (paymentAmount <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }
  // You might also want to add validation for cashierId

  const updatedSale = await prisma.$transaction(async (transaction) => {
    // 1. Fetch the current sale details using the transaction client
    const sale = await transaction.sale.findUnique({
      where: {
        id: saleId,
      },
      select: {
        id: true,
        totalAmount: true,
        amountPaid: true,
        amountDue: true,
        paymentStatus: true,
      },
    });

    if (!sale) {
      throw new Error(`Sale with ID ${saleId} not found.`);
    }

    // Convert Decimal types to numbers for calculations.
    // As noted before, for high precision, consider a BigNumber library or Prisma's increment/decrement.
    const currentAmountPaid = sale.amountPaid.toNumber();
    const currentAmountDue = sale.amountDue.toNumber();
    const totalSaleAmount = sale.totalAmount.toNumber();

    // 2. Calculate new amounts for the Sale record
    let newAmountPaid = currentAmountPaid + paymentAmount;
    let newAmountDue = currentAmountDue - paymentAmount;

    // Ensure amountDue does not go below zero
    if (newAmountDue < 0) {
      newAmountDue = 0;
    }

    // 3. Determine new payment status for the Sale record
    let newPaymentStatus: "paid" | "partial" | "pending";
    if (newAmountPaid >= totalSaleAmount) {
      newPaymentStatus = "paid";
      newAmountDue = 0; // Ensure amountDue is 0 if fully paid
    } else if (newAmountPaid > 0 && newAmountPaid < totalSaleAmount) {
      newPaymentStatus = "partial";
    } else {
      newPaymentStatus = "pending";
    }

    // 4. Update the Sale record using the transaction client
    const updatedSaleRecord = await transaction.sale.update({
      where: {
        id: saleId,
      },
      data: {
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
        paymentStatus: newPaymentStatus,
        updatedAt: new Date(),
      },
    });

    // 5. Create a new Payment record for the received amount
    // This is generally how you track individual payments.
    await transaction.payment.create({
      data: {
        saleId: saleId,
        // customerId: "", // Link to customer if available
        cashierId: cashierId ?? "", // The user processing this payment
        paymentType: "outstanding_payment", // Or "outstanding_payment" if it's specifically for a debt
        paymentMethod: "cash", // You might want to pass this as a parameter as well
        amount: paymentAmount,
        status: "completed", // Assuming it's a successful payment
        notes: `Payment for Sale ${saleId}`,
        createdAt: new Date(),
      },
    });

    // You can return the updated sale record or an object containing both
    const serializedUpdatedSaleRecord = {
      ...updatedSaleRecord,
      totalAmount: updatedSaleRecord.totalAmount.toString(),
      amountPaid: updatedSaleRecord.amountPaid.toString(),
      amountDue: updatedSaleRecord.amountDue.toString(),
      createdAt: updatedSaleRecord.createdAt.toISOString(),
      updatedAt: updatedSaleRecord.updatedAt.toISOString(),
    };

    return serializedUpdatedSaleRecord;
  });
  revalidatePath("/sells/debtSell");
  return updatedSale; // Return the result of the transaction
}
type DateRange = {
  from: Date | null;
  to: Date | null;
};

type productFilters = {
  categoryId: string;
  warehouseId: string;
  supplierId: string;
};
type searchParam = {
  from: string;
  to: string;
  categoryId?: string;
  supplierId?: string;
  warehouseId?: string;
  users?: string;
};
// };
// export async function fetchSalesSummary(
//   role: string,

//   from?: string,
//   to?: string
// ) {
//   // Construct your date filters for the database query
//   const fromatDate = from ? new Date(from).toISOString() : undefined;
//   const toDate = to ? new Date(to).toISOString() : undefined;
//   const dateRange: any = { gte: fromatDate, lte: toDate };
//   // const filter: any={
//   //   sale: {
//   //     saleItems: {
//   //       pr
//   //     }

//   // }

//   console.log(fromatDate, "from");
//   console.log(dateRange);

//   const totalSales = await prisma.sale.aggregate({
//     _count: { id: true },
//     where: {
//       saleDate: {
//         ...(dateRange && {
//           ...dateRange,
//         }),
//       },

//       status: "completed",
//     },
//   });

//   const totalDebtAmount = await prisma.sale.aggregate({
//     _sum: { amountDue: true },
//     where: {
//       saleDate: {
//         ...(fromatDate && {
//           gte: fromatDate,
//         }),
//         ...(toDate && {
//           lte: toDate,
//         }),
//       },
//     },
//   });
//   const totalPurchces = await prisma.product.aggregate({
//     _sum: { costPrice: true },
//     where: {
//       createdAt: {
//         ...(fromatDate && {
//           gte: fromatDate,
//         }),
//         ...(toDate && {
//           lte: toDate,
//         }),
//       },
//     },
//   });
//   const debtPayments = await prisma.payment.aggregate({
//     _sum: { amount: true },
//     _count: { id: true },
//     where: {
//       createdAt: {
//         ...(fromatDate && {
//           gte: fromatDate,
//         }),
//         ...(toDate && {
//           lte: toDate,
//         }),
//       },
//       paymentType: { in: ["outstanding_payment"] },
//       status: "completed",
//     },
//   });
//   const revenu = await prisma.payment.aggregate({
//     _sum: { amount: true },

//     where: {
//       createdAt: {
//         ...(fromatDate && {
//           gte: fromatDate,
//         }),
//         ...(toDate && {
//           lte: toDate,
//         }),
//       },
//       status: "completed",
//     },
//   });

//   let cashierSalesToday = null;
//   let cashierTransactionsToday = null;
//   let cashierDebtPaymentsToday = null;
//   let cashierDebtPaymentsCountToday = null;

//   if (role === "admin") {
//     const cashierDailySales = await prisma.sale.aggregate({
//       _sum: { totalAmount: true },
//       _count: { id: true },

//       where: {
//         // cashierId: currentCashierId, // Add if needed
//         saleDate: {
//           ...(fromatDate && {
//             gte: fromatDate,
//           }),
//           ...(toDate && {
//             lte: toDate,
//           }),
//         },
//         status: "completed",
//       },
//     });

//     cashierSalesToday = cashierDailySales._sum.totalAmount?.toNumber() || 0;
//     cashierTransactionsToday = cashierDailySales._count.id;

//     const cashierDailyDebtPayments = await prisma.payment.aggregate({
//       _sum: { amount: true },
//       _count: { id: true },
//       where: {
//         createdAt: {
//           ...(fromatDate && {
//             gte: fromatDate,
//           }),
//           ...(toDate && {
//             lte: toDate,
//           }),
//         },
//         paymentType: { in: ["sale_payment", "outstanding_payment"] },
//         status: "completed",
//       },
//     });

//     cashierDebtPaymentsToday =
//       cashierDailyDebtPayments._sum.amount?.toNumber() || 0;
//     cashierDebtPaymentsCountToday = cashierDailyDebtPayments._count.id;
//   }
//   const salesOverTime = await prisma.sale.groupBy({
//     by: ["saleDate"],
//     _sum: { totalAmount: true },
//     where: {
//       saleDate: {
//         ...(fromatDate && { gte: fromatDate }),
//         ...(toDate && { lte: toDate }),
//       },
//       status: "completed",
//     },
//     orderBy: { saleDate: "asc" },
//   });
//   const recentSales = await prisma.sale.findMany({
//     where: {
//       saleDate: {
//         ...(fromatDate && { gte: fromatDate }),
//         ...(toDate && { lte: toDate }),
//       },
//       status: "completed",
//     },
//   });
//   const purchasesOverTime = await prisma.product.groupBy({
//     by: ["createdAt"],
//     _sum: { costPrice: true },
//     where: {
//       createdAt: {
//         ...(fromatDate && { gte: fromatDate }),
//         ...(toDate && { lte: toDate }),
//       },
//     },
//     orderBy: { createdAt: "asc" },
//   });

//   const chartData = salesOverTime.map((sale) => ({
//     date: sale.saleDate.toISOString().split("T")[0],
//     revenue: sale._sum.totalAmount?.toNumber() || 0,
//     purchases:
//       purchasesOverTime
//         .find(
//           (p) =>
//             p.createdAt.toISOString().split("T")[0] ===
//             sale.saleDate.toISOString().split("T")[0]
//         )
//         ?._sum.costPrice?.toNumber() || 0,
//   }));

//   return {
//     transactionsToday: totalSales._count.id,
//     totalDebtAmount: totalDebtAmount._sum.amountDue?.toNumber() || 0,
//     recivedDebtAmount: debtPayments._sum.amount?.toNumber() || 0,
//     totalRevenu: revenu._sum.amount?.toNumber() || 0,
//     totalPurchces: totalPurchces._sum.costPrice?.toNumber() || 0,
//     cashierSalesToday,
//     cashierTransactionsToday,
//     cashierDebtPaymentsToday,
//     cashierDebtPaymentsCountToday,
//     chartData,
//   };
// }

// import { unstable_cache } from "next/cache";

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
//   }
// ) {
//   const formatRange = (from?: string, to?: string) => ({
//     ...(from ? { gte: new Date(from) } : {}),
//     ...(to ? { lte: new Date(to) } : {}),
//   });
//   const salesRange = formatRange(
//     filters?.salesFrom || filters?.allFrom,
//     filters?.salesTo || filters?.allTo
//   );
//   const purchasesRange = formatRange(
//     filters?.purchasesFrom || filters?.allFrom,
//     filters?.purchasesTo || filters?.allTo
//   );
//   const revenueRange = formatRange(
//     filters?.revenueFrom || filters?.allFrom,
//     filters?.revenueTo || filters?.allTo
//   );
//   const debtRange = formatRange(
//     filters?.debtFrom || filters?.allFrom,
//     filters?.debtTo || filters?.allTo
//   );

//   // Run queries in parallel
//   const [
//     totalSalesAgg,
//     salesOverTime,
//     totalPurchasesAgg,
//     purchasesOverTime,
//     totalRevenueAgg,
//     revenueOverTime,
//     totalDebtAgg,
//     debtPaymentsAgg,
//     debtOverTime,
//   ] = await Promise.all([
//     prisma.sale.aggregate({
//       _count: { id: true },
//       where: { saleDate: salesRange, status: "completed" },
//     }),
//     prisma.sale.groupBy({
//       by: ["saleDate"],
//       _sum: { totalAmount: true },
//       where: { saleDate: salesRange, status: "completed" },
//       orderBy: { saleDate: "asc" },
//     }),
//     prisma.product.aggregate({
//       _sum: { costPrice: true },
//       where: { createdAt: purchasesRange },
//     }),
//     prisma.product.groupBy({
//       by: ["createdAt"],
//       _sum: { costPrice: true },
//       where: { createdAt: purchasesRange },
//       orderBy: { createdAt: "asc" },
//     }),
//     prisma.payment.aggregate({
//       _sum: { amount: true },
//       where: { createdAt: revenueRange, status: "completed" },
//     }),
//     prisma.payment.groupBy({
//       by: ["createdAt"],
//       _sum: { amount: true },
//       where: { createdAt: revenueRange, status: "completed" },
//       orderBy: { createdAt: "asc" },
//     }),
//     prisma.sale.aggregate({
//       _sum: { amountDue: true },
//       where: { saleDate: debtRange },
//     }),
//     prisma.payment.aggregate({
//       _sum: { amount: true },
//       _count: { id: true },
//       where: {
//         createdAt: debtRange,
//         paymentType: { in: ["outstanding_payment"] },
//         status: "completed",
//       },
//     }),
//     prisma.payment.groupBy({
//       by: ["createdAt"],
//       _sum: { amount: true },
//       where: {
//         createdAt: debtRange,
//         paymentType: { in: ["outstanding_payment"] },
//         status: "completed",
//       },
//       orderBy: { createdAt: "asc" },
//     }),
//   ]);

//   const salesChart = salesOverTime.map((s) => ({
//     date: s.saleDate.toISOString().split("T")[0],
//     value: s._sum.totalAmount?.toNumber() || 0,
//   }));
//   const purchasesChart = purchasesOverTime.map((p) => ({
//     date: p.createdAt.toISOString().split("T")[0],
//     value: p._sum.costPrice?.toNumber() || 0,
//   }));
//   const revenueChart = revenueOverTime.map((r) => ({
//     date: r.createdAt.toISOString().split("T")[0],
//     value: r._sum.amount?.toNumber() || 0,
//   }));
//   const debtChart = debtOverTime.map((d) => ({
//     date: d.createdAt.toISOString().split("T")[0],
//     value: d._sum.amount?.toNumber() || 0,
//   }));

//   return {
//     sales: { total: totalSalesAgg._count.id, chart: salesChart },
//     purchases: {
//       total: totalPurchasesAgg._sum.costPrice?.toNumber() || 0,
//       chart: purchasesChart,
//     },
//     revenue: {
//       total: totalRevenueAgg._sum.amount?.toNumber() || 0,
//       chart: revenueChart,
//     },
//     debt: {
//       totalDebt: totalDebtAgg._sum.amountDue?.toNumber() || 0,
//       received: debtPaymentsAgg._sum.amount?.toNumber() || 0,
//       chart: debtChart,
//     },
//   };
// }

// export async function fetchProductStats(role: string) {
//   let totalStockQuantity = null;

//   if (role === "admin") {
//     const stock = await prisma.inventory.aggregate({
//       _sum: { stockQuantity: true },
//     });
//     totalStockQuantity = stock._sum.stockQuantity || 0;
//   }

//   // Raw SQL for comparing two fields
//   const result = await prisma.$queryRawUnsafe<{ count: number }[]>(`
//   SELECT COUNT(*) as count
//   FROM "inventory"
//   WHERE  "reorder_level">="stock_quantity"
//   `);
//   const z = 0;
//   const finished = await prisma.$queryRawUnsafe<{ count: number }[]>(`
//   SELECT COUNT(*) as count
//   FROM "inventory"
//   WHERE "stock_quantity" = ${z}
//   `);
//   // Get detailed low stock products for notifications
//   const lowStockDetails = await prisma.$queryRaw<
//     Array<{
//       product_id: string;
//       stock_quantity: number;
//       reorder_level: number;
//       product_name: string;
//     }>
//   >`
//     SELECT
//       i."product_id",
//       i."stock_quantity",
//       i."reorder_level",
//       p."name" as product_name
//     FROM "inventory" i
//     JOIN "products" p ON i."product_id" = p."id"
//     WHERE i."reorder_level" >= i."stock_quantity"
//     ORDER BY i."stock_quantity" ASC

//   `;

//   const lowStockProducts = result[0]?.count || 0;
//   const zeroProducts = finished[0]?.count || 0;

//   return {
//     totalStockQuantity,
//     lowStockProducts,
//     zeroProducts,
//     lowStockDetails,
//   };
// }

// export async function Fetchusers(isActive: boolean) {
//   // let totalUser;
//   const users = await prisma.user.aggregate({
//     _count: { id: true },
//     where: {
//       isActive: isActive,
//     },
//   });
//   return {
//     users: users._count.id,
//   };
// }

// export async function getTopSellingProducts(
//   limit = 5,

//   from?: string,
//   to?: string,
//   categoryId?: string
// ) {
//   let dateFilter: any = {}; // Object to hold date filtering conditions

//   if (from) {
//     // For a date range, query from the very beginning of the start day
//     dateFilter.gte = startOfDay(from); // Greater than or equal to
//   }

//   if (to) {
//     // For a date range, query up to the very end of the end day
//     dateFilter.lte = endOfDay(to); // Less than or equal to
//   }

//   const saleItems = await prisma.saleItem.findMany({
//     where: {
//       createdAt: {
//         ...dateFilter,
//       },
//       ...(categoryId && {
//         product: {
//           is: {
//             categoryId,
//           },
//         },
//       }),
//     },
//     select: {
//       productId: true,
//       quantity: true,
//       product: {
//         select: {
//           name: true,
//           categoryId: true,
//         },
//       },
//     },
//   });

//   const grouped = saleItems.reduce<
//     Record<string, { name: string; quantity: number }>
//   >((acc, item) => {
//     const name = item.product.name ?? "Unknown";
//     acc[item.productId] = acc[item.productId] || { name, quantity: 0 };
//     acc[item.productId].quantity += item.quantity;
//     return acc;
//   }, {});

//   const sorted = Object.values(grouped)
//     .sort((a, b) => b.quantity - a.quantity)
//     .slice(0, limit);

//   return sorted;
// }

// export async function fetchrevnu(from?: string, to?: string, groupBy?: string) {
//   let dateFilter: any = {};

//   if (from) {
//     dateFilter.gte = startOfDay(new Date(from));
//   }

//   if (to) {
//     dateFilter.lte = endOfDay(new Date(to));
//   }

//   // Fetch payments
//   const payments = await prisma.payment.findMany({
//     where: {
//       createdAt: {
//         ...dateFilter,
//       },
//     },
//     select: {
//       amount: true, // Prisma.Decimal
//       createdAt: true,
//     },
//   });

//   // Group by day or month
//   const grouped = payments.reduce<
//     Record<string, { date: string; total: number }>
//   >((acc, payment) => {
//     const key =
//       groupBy === "month"
//         ? format(payment.createdAt, "MM").toLocaleString()
//         : format(payment.createdAt, "yyyy-MM");
//     const formattedDate = new Date(key).toLocaleDateString("ar-EG", {
//       day: "numeric",
//       month: "short",
//       year: "numeric",
//     });
//     if (!acc[key]) {
//       acc[key] = { date: formattedDate, total: 0 };
//     }

//     // Convert Prisma.Decimal → number
//     acc[key].total += Number(payment.amount);

//     return acc;
//   }, {});

//   // Instead of returning the object
//   const sort = Object.values(grouped).sort(
//     (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
//   );

//   return sort;
// }
export async function checkLowStockAndNotify(role: string) {
  try {
    const stats = await fetchProductStats(role);
    return stats.lowStockDetails; // ✅ only return data
  } catch (err) {
    console.error("Failed to check stock:", err);
    return [];
  }
}
