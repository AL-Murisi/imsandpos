import prisma from "@/lib/prisma";
import fs, { stat } from "fs";
import path from "path";
import Handlebars from "handlebars";
import { NextRequest } from "next/server";
import { getBrowser } from "@/lib/puppeteerInstance";
import { getSession } from "@/lib/session";
import { getCompany } from "@/lib/actions/createcompnayacc";
import { Prisma } from "@prisma/client";
import { reserveStock } from "@/lib/actions/warehouse";
import { useFormatter } from "@/hooks/usePrice";
import { se } from "date-fns/locale";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ reportType: string }>;
}

// Register Handlebars helpers once
Handlebars.registerHelper("eq", (a, b) => a === b);
Handlebars.registerHelper("lt", (a, b) => a < b);
Handlebars.registerHelper("gt", (a, b) => a > b);
Handlebars.registerHelper("add", (a, b) => Number(a) + Number(b));
Handlebars.registerHelper("subtract", (a, b) => Number(a) - Number(b));
Handlebars.registerHelper("multiply", (a, b) => Number(a) * Number(b));
Handlebars.registerHelper("divide", (a: number, b: number) =>
  b !== 0 ? a / b : 0,
);
function mapType(ref: string | null) {
  if (!ref) return "عملية";
  if (ref.includes("مدفوع")) return "دفعة";
  if (ref.includes("غير مدفوع")) return "فاتورة غير مدفوعة";
  if (ref.includes("تكلفة")) return "قيد مخزون";
  if (ref.includes("مرتجع")) return "مرتجع";
  return ref;
}

Handlebars.registerHelper("formatNumber", (num) =>
  new Intl.NumberFormat("ar-EG").format(Number(num)),
);

// Helper function to format dates
const formatDate = (date: string | undefined) => {
  return date ? new Date(date).toLocaleDateString("ar-EG") : "";
};

// Helper function to create date filters
const createDateFilter = (fromDate?: string, toDate?: string) => ({
  ...(fromDate && { gte: new Date(fromDate).toISOString() }),
  ...(toDate && { lte: new Date(toDate).toISOString() }),
});

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { reportType } = await context.params;
    const {
      from: rawFrom,
      to: rawTo,
      customerId,

      accountId,
      id,
      suppliersId,
      salesTypes,
      userId,
      warehouseId,
      paymentTypes,
      branchId,
    } = await req.json();

    const fromDate = rawFrom ? new Date(rawFrom).toISOString() : undefined;
    const toDate = rawTo ? new Date(rawTo).toISOString() : undefined;
    const fromDisplay = formatDate(rawFrom);
    const toDisplay = formatDate(rawTo);

    // Auth
    const user = await getSession();
    const company = await getCompany();
    if (!user || !company?.data) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const isAdmin = user.role === "admin";
    const scopedUserId = isAdmin ? userId : user.userId;
    const cashierFilter = scopedUserId ? { cashierId: scopedUserId } : {};

    let data: any = {};
    let templateFile = "";

    const selectedBranch =
      company.data.branches.find((b) => b.id === branchId) ??
      company.data.branches[0] ??
      null;

    const companyWithBranch = {
      ...company.data,
      branchName: selectedBranch?.name ?? "",
      branchLocation: selectedBranch?.location ?? "",
    };

    const baseData = {
      company: companyWithBranch,
      from: fromDisplay,
      to: toDisplay,
      createby: user.name,
      date: new Date().toLocaleDateString("ar-EG"),
    };

    /* ==================== REPORT HANDLERS ==================== */

    switch (reportType) {
      case "sales": {
        templateFile = "sales-report.html";

        const fiscalYear = await prisma.fiscal_periods.findFirst({
          where: {
            company_id: user.companyId,
            is_closed: false,
          },
          select: { start_date: true, end_date: true },
        });

        if (!fiscalYear) return;

        const fromDate = new Date(fiscalYear.start_date);
        fromDate.setHours(0, 0, 0, 0);

        const toDate = new Date(fiscalYear.end_date);
        toDate.setHours(23, 59, 59, 999);

        const sales = await prisma.invoiceItem.findMany({
          where: {
            companyId: user.companyId,
            invoice: {
              ...cashierFilter,
              // 1. Fixed logic: Get items BETWEEN from and to
              invoiceDate: {
                gte: fromDate,
                lte: toDate,
              },
              sale_type: salesTypes,
              ...(branchId && { branchId }),
              // 2. Critical: Only include Sales (exclude purchases)
            },
          },
          include: {
            product: true,
            invoice: true,
          },
        });

        data = {
          ...baseData,
          sales: sales.map((s) => ({
            product: s.product.name,
            quantity: s.quantity.toNumber(), // Decimal to Number
            total: s.totalPrice.toNumber(), // Decimal to Number
            sellingUnit: s.unit,
            date: s.invoice.invoiceDate.toLocaleDateString("ar-EG"), // Usually better for reports
            salestype: s.invoice.sale_type === "SALE" ? "بيع" : "مرتجع",
            price: s.price,
          })),
          period: {
            from: fromDate.toLocaleDateString("ar-EG"),
            to: toDate.toLocaleDateString("ar-EG"),
          },
          totalSales: sales.reduce(
            (sum, s) => sum + s.totalPrice.toNumber(),
            0,
          ),
        };
        break;
      }

      case "sales-by-product": {
        templateFile = "sales-by-product-report.html";
        const fiscalYear = await prisma.fiscal_periods.findFirst({
          where: {
            company_id: user.companyId,
            is_closed: false,
          },
          select: { start_date: true, end_date: true },
        });

        if (!fiscalYear) return;

        const fromDate = new Date(fiscalYear.start_date);
        fromDate.setHours(0, 0, 0, 0);

        const toDate = new Date(fiscalYear.end_date);
        toDate.setHours(23, 59, 59, 999);
        const salesByProduct = await prisma.invoiceItem.groupBy({
          by: ["productId"],
          where: {
            companyId: user.companyId,
            invoice: {
              ...cashierFilter,
              invoiceDate: {
                gte: fromDate,
                lte: toDate,
              },
              sale_type: "SALE",
              ...(branchId && { branchId }),
            },
          },
          _sum: {
            quantity: true,
            totalPrice: true,
          },
        });

        const products = await prisma.product.findMany({
          where: {
            id: { in: salesByProduct.map((s) => s.productId) },
          },
        });

        data = {
          ...baseData,
          salesByProduct: salesByProduct.map((s) => {
            const product = products.find((p) => p.id === s.productId);
            return {
              product: products.find((p) => p.id === s.productId)?.name,
              quantity: s._sum.quantity,
              total: Number(s._sum.totalPrice),
            };
          }),
          period: {
            from: fromDate.toLocaleDateString("ar-EG"),
            to: toDate.toLocaleDateString("ar-EG"),
          },
          totalSales: salesByProduct.reduce(
            (sum, s) => sum + Number(s._sum.totalPrice || 0),
            0,
          ),
        };
        break;
      }

      case "sales-by-user": {
        templateFile = "sales-by-user-report.html";
        if (!scopedUserId) {
          return new Response(JSON.stringify({ error: "userId is required" }), {
            status: 400,
          });
        }

        const fiscalYear = await prisma.fiscal_periods.findFirst({
          where: {
            company_id: user.companyId,
            is_closed: false,
          },
          select: { start_date: true, end_date: true },
        });

        if (!fiscalYear) return;

        const fromDate = new Date(fiscalYear.start_date);
        fromDate.setHours(0, 0, 0, 0);

        const toDate = new Date(fiscalYear.end_date);
        toDate.setHours(23, 59, 59, 999);

        const sales = await prisma.invoiceItem.findMany({
          where: {
            companyId: user.companyId,
            invoice: {
              cashierId: scopedUserId,

              // 1. Fixed logic: Get items BETWEEN from and to
              invoiceDate: {
                gte: fromDate,
                lte: toDate,
              },
              sale_type: salesTypes,
              ...(branchId && { branchId }),
              // 2. Critical: Only include Sales (exclude purchases)
            },
          },
          include: {
            product: true,
            invoice: { include: { cashier: true, branch: true } },
          },
        });

        data = {
          ...baseData,
          sales: sales.map((s) => ({
            product: s.product.name,
            quantity: s.quantity.toNumber(), // Decimal to Number
            total: s.totalPrice.toNumber(), // Decimal to Number
            sellingUnit: s.unit,
            date: s.invoice.invoiceDate.toLocaleDateString("ar-EG"), // Usually better for reports

            salestype: s.invoice.sale_type === "SALE" ? "بيع" : "مرتجع",
            price: s.price,
          })),
          casherNmae: sales[0].invoice.cashier?.name,
          branchName: sales[0].invoice.branch?.name,
          period: {
            from: fromDate.toLocaleDateString("ar-EG"),
            to: toDate.toLocaleDateString("ar-EG"),
          },
          totalSales: sales.reduce(
            (sum, s) => sum + s.totalPrice.toNumber(),
            0,
          ),
        };
        break;
      }

      case "daily-sales": {
        templateFile = "daily-sales-report.html";

        // 🔹 Today range
        const fromDate = new Date();
        fromDate.setHours(0, 0, 0, 0);

        const toDate = new Date();
        toDate.setHours(23, 59, 59, 999);

        const sales = await prisma.invoiceItem.findMany({
          where: {
            companyId: user.companyId,
            invoice: {
              ...cashierFilter,
              invoiceDate: {
                gte: fromDate,
                lte: toDate,
              },
              sale_type: salesTypes,
              ...(branchId && { branchId }),
            },
          },
          include: {
            product: true,
            invoice: { include: { cashier: true, branch: true } },
          },
        });

        data = {
          ...baseData,
          sales: sales.map((s) => ({
            product: s.product.name,
            quantity: s.quantity.toNumber(),
            total: s.totalPrice.toNumber(),
            sellingUnit: s.unit,
            date: s.invoice.invoiceDate.toLocaleDateString("ar-EG"),
            salestype: s.invoice.sale_type === "SALE" ? "بيع" : "مرتجع",
            price: s.price,
          })),
          casherNmae: sales[0]?.invoice.cashier?.name ?? "",
          branchName: sales[0]?.invoice.branch?.name ?? "",
          period: {
            from: fromDate.toLocaleDateString("ar-EG"),
            to: toDate.toLocaleDateString("ar-EG"),
          },
          totalSales: sales.reduce(
            (sum, s) => sum + s.totalPrice.toNumber(),
            0,
          ),
        };

        break;
      }

      case "profit-by-product": {
        templateFile = "profit-by-product-report.html";
        const salesItems = await prisma.invoiceItem.findMany({
          where: {
            companyId: user.companyId,
            invoice: {
              ...cashierFilter,
              ...(branchId && { branchId }),
            },
          },
          include: {
            product: {
              select: {
                name: true,
              },
            },
          },
        });

        const profitByProduct = salesItems.reduce(
          (acc, item) => {
            const cost = Number(item.price) * Number(item.quantity);
            const revenue = Number(item.totalPrice);
            const profit = revenue - cost;

            const key = item.productId;
            if (!acc[key]) {
              acc[key] = {
                product: item.product.name,
                revenue: 0,
                cost: 0,
                profit: 0,
                quantity: 0,
              };
            }
            acc[key].revenue += revenue;
            acc[key].cost += cost;
            acc[key].profit += profit;
            acc[key].quantity += item.quantity;
            return acc;
          },
          {} as Record<string, any>,
        );

        data = {
          ...baseData,
          profitByProduct: Object.values(profitByProduct),
          totalRevenue: Object.values(profitByProduct).reduce(
            (sum: number, p: any) => sum + p.revenue,
            0,
          ),
          totalCost: Object.values(profitByProduct).reduce(
            (sum: number, p: any) => sum + p.cost,
            0,
          ),
          totalProfit: Object.values(profitByProduct).reduce(
            (sum: number, p: any) => sum + p.profit,
            0,
          ),
        };
        break;
      }

      case "profit-loss": {
        templateFile = "profit-loss-report.html";

        let profitLossFrom = fromDate;
        let profitLossTo = toDate;

        if (!profitLossFrom || !profitLossTo) {
          const fiscalYear = await prisma.fiscal_periods.findFirst({
            where: {
              company_id: user.companyId,
              is_closed: false,
            },
            select: { start_date: true, end_date: true },
          });

          if (!fiscalYear) {
            return new Response(
              JSON.stringify({ error: "No open fiscal year" }),
              { status: 400 },
            );
          }

          profitLossFrom = new Date(fiscalYear.start_date).toISOString();
          profitLossTo = new Date(fiscalYear.end_date).toISOString();
        }

        // 1. Fetch relevant accounts grouped by their P&L role
        const [revenueAccs, cogsAccs, expenseAccs] = await Promise.all([
          prisma.accounts.findMany({
            where: { company_id: user.companyId, account_type: "REVENUE" },
            include: {
              journalLines: {
                where: {
                  header: {
                    status: "POSTED",
                    entryDate: { gte: profitLossFrom, lte: profitLossTo },
                    ...(branchId && { branchId }),
                  },
                },
              },
            },
          }),
          prisma.accounts.findMany({
            where: {
              company_id: user.companyId,
              OR: [
                { account_type: "COST_OF_GOODS" },
                {
                  account_type: "EXPENSE",
                  account_category: "COST_OF_GOODS_SOLD",
                },
              ],
            },
            include: {
              journalLines: {
                where: {
                  header: {
                    status: "POSTED",
                    entryDate: { gte: profitLossFrom, lte: profitLossTo },
                    ...(branchId && { branchId }),
                  },
                },
              },
            },
          }),
          prisma.accounts.findMany({
            where: {
              company_id: user.companyId,
              account_type: "EXPENSE",
              account_category: { not: "COST_OF_GOODS_SOLD" },
            },
            include: {
              journalLines: {
                where: {
                  header: {
                    status: "POSTED",
                    entryDate: { gte: profitLossFrom, lte: profitLossTo },
                    ...(branchId && { branchId }),
                  },
                },
              },
            },
          }),
        ]);

        // 2. Helper function to calculate balance from entries
        // Revenue: Credit - Debit | Expenses: Debit - Credit
        const calculateBalance = (accs: any[], type: "REVENUE" | "EXPENSE") => {
          return accs
            .map((acc) => {
              const total = acc.journalLines.reduce((sum: number, je: any) => {
                const signedValue =
                  je.baseAmount !== null && je.baseAmount !== undefined
                    ? Number(je.debit) > 0
                      ? Number(je.baseAmount)
                      : -Number(je.baseAmount)
                    : Number(je.debit) - Number(je.credit);

                return sum + signedValue;
              }, 0);

              // Flip sign for Revenue (Credits are positive income)
              const finalAmount = type === "REVENUE" ? -total : total;

              return {
                name: acc.account_name_en || acc.account_name_ar,
                amount: finalAmount.toFixed(2),
              };
            })
            .filter((a) => Number(a.amount) !== 0); // Only show accounts with activity
        };

        const revenue = calculateBalance(revenueAccs, "REVENUE");
        const cogs = calculateBalance(cogsAccs, "EXPENSE");
        const expenses = calculateBalance(expenseAccs, "EXPENSE");

        const totalRevenue = revenue.reduce((s, r) => s + Number(r.amount), 0);
        const totalCogs = cogs.reduce((s, c) => s + Number(c.amount), 0);
        const totalExpenses = expenses.reduce(
          (s, e) => s + Number(e.amount),
          0,
        );

        const grossProfit = totalRevenue - totalCogs;
        const netProfit = grossProfit - totalExpenses;

        data = {
          ...baseData,
          from: profitLossFrom,
          to: profitLossTo,
          revenue,
          cogs,
          expenses,
          totalRevenue: totalRevenue.toFixed(2),
          totalCogs: totalCogs.toFixed(2),
          grossProfit: grossProfit.toFixed(2),
          totalExpenses: totalExpenses.toFixed(2),
          netProfit: netProfit.toFixed(2),
        };
        console.log(data);
        break;
      }

      case "inventory": {
        templateFile = "inventory-report.html";
        const inventory = await prisma.inventory.findMany({
          where: {
            companyId: user.companyId,
            warehouseId: warehouseId,
            ...(branchId && { branchId }),
            updatedAt: createDateFilter(fromDate, toDate),
          },
          select: {
            product: {
              select: {
                name: true,
                sku: true,
              },
            },
            batches: {
              select: {
                costPrice: true,
                remainingQuantity: true,

                supplier: { select: { name: true } },
              },
            },
            warehouse: true,
            stockQuantity: true,
            availableQuantity: true,
            lastStockTake: true,
          },
        });

        data = {
          ...baseData,
          inventory: inventory.map((i) => {
            const mainBatch = i.batches.sort(
              (a, b) => (b.remainingQuantity ?? 0) - (a.remainingQuantity ?? 0),
            )[0];
            const inventoryValue = i.batches.reduce(
              (sum, b) =>
                sum +
                Number(i.availableQuantity ?? 0) * Number(b.costPrice ?? 0),
              0,
            );
            return {
              product: i.product.name,
              stock: i.availableQuantity,
              supplier: mainBatch.supplier?.name,
              warehouse: i.warehouse.name,
              lastStockTake: i.lastStockTake?.toLocaleDateString("ar-EG"),
              value: inventoryValue,
            };
          }),
          totalInventoryValue: inventory.reduce((sum, i) => {
            const value = i.batches.reduce(
              (s, b) =>
                s + Number(i.availableQuantity ?? 0) * Number(b.costPrice ?? 0),
              0,
            );
            return sum + value;
          }, 0),
          period: {
            from: fromDate,
            to: toDate,
          },
        };

        break;
      }

      case "low-stock": {
        const rawQuery = Prisma.sql`
          SELECT
            i.id AS inventoryId,
            i."stock_quantity",
            i."available_quantity",
            i."reorder_level",
            p.id AS product_id,
            p.name AS productName,
            w.name AS warehouseName
          FROM
            "inventory" i
          JOIN
            "products" p ON i."product_id" = p.id
          JOIN
            "warehouses" w ON i."warehouse_id" = w.id
          WHERE
            i."company_id" = ${user.companyId} AND
            i."warehouse_id"=${warehouseId}
            AND (
              i."stock_quantity" <= i."reorder_level"
              OR i."stock_quantity" = 0
            );
        `;

        type LowStockResult = {
          inventoryId: string;
          stockQuantity: number;
          reorderLevel: number;
          productId: string;
          productName: string;
          warehouseName: string;
        };

        const lowStockRecords: LowStockResult[] =
          await prisma.$queryRaw<LowStockResult[]>(rawQuery);
        Handlebars.registerHelper("eq", (a, b) => a === b);
        Handlebars.registerHelper("lt", (a, b) => a < b);

        templateFile = "out-of-stock-report.html"; // Assume you have a template
        data = {
          ...baseData,
          lowStockRecords,
        };
        break;
      }

      case "stock-movement": {
        templateFile = "stock-movement-report.html";
        const movements = await prisma.stockMovement.findMany({
          where: {
            companyId: user.companyId,
            warehouseId: warehouseId,
            createdAt: createDateFilter(fromDate, toDate),
          },
          include: {
            product: true,
            warehouse: true,
          },
          orderBy: { createdAt: "desc" },
        });

        data = {
          ...baseData,
          movements: movements.map((m) => ({
            date: m.createdAt.toLocaleDateString("ar-EG"),
            product: m.product.name,
            warehouse: m.warehouse.name,
            type: m.movementType,
            quantity: m.quantity,
            reference: m.referenceId || "-",
          })),
        };
        break;
      }

      case "expiring-products": {
        templateFile = "expiring-products-report.html";
        const today = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);

        const longTimeAgo = new Date();
        longTimeAgo.setFullYear(today.getFullYear() - 10);

        const inventoryWithExpiringBatches = await prisma.inventory.findMany({
          where: {
            companyId: user.companyId,
            warehouseId: warehouseId,
            ...(branchId && { branch_id: branchId }),
            batches: {
              some: {
                expiredAt: {
                  lte: thirtyDaysFromNow,
                  gte: longTimeAgo,
                },
              },
            },
          },
          select: {
            product: { select: { name: true, sku: true } },
            warehouse: { select: { name: true } },
            stockQuantity: true,
            batches: {
              where: {
                expiredAt: {
                  lte: thirtyDaysFromNow,
                  gte: longTimeAgo,
                },
              },
              select: {
                expiredAt: true,
                remainingQuantity: true, // Useful to show how much of the batch is left
              },
              orderBy: { expiredAt: "asc" },
            },
          },
        });

        // FlatMap allows us to create one row per expiring batch
        const reportRows = inventoryWithExpiringBatches.flatMap((inv) => {
          return inv.batches.map((batch) => {
            const expiryDate = new Date(batch.expiredAt ?? "");
            const daysDiff = Math.ceil(
              (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
            );

            let status = "غير معروف";

            if (daysDiff < 0) {
              status = "منتهي الصلاحية";
            } else if (daysDiff === 0) {
              status = "ينتهي اليوم";
            } else if (daysDiff <= 3) {
              status = "ينتهي قريباً (خلال 3 أيام)";
            } else if (daysDiff <= 30) {
              status = "ينتهي خلال 30 يوم";
            } else {
              status = "صالح";
            }
            return {
              name: inv.product?.name,
              sku: inv.product?.sku,
              expiryDate: expiryDate.toLocaleDateString("ar-EG"),
              stock: batch.remainingQuantity ?? 0, // Showing batch stock is more accurate for reports
              warehouse: inv.warehouse?.name ?? "N/A",
              daysUntilExpiry: daysDiff,
              status,
            };
          });
        });

        data = {
          ...baseData,
          expiringProducts: reportRows,
        };
        break;
      }

      case "stock-take": {
        templateFile = "stock-take-report.html";
        const stockTake = await prisma.inventory.findMany({
          where: {
            companyId: user.companyId,
            warehouseId: warehouseId,

            lastStockTake: createDateFilter(fromDate, toDate),
          },
          include: {
            product: true,
            warehouse: true,
          },
        });
        data = {
          ...baseData,
          stockTake: stockTake.map((s) => ({
            product: s.product.name,
            warehouse: s.warehouse.name,
            expectedStock: s.stockQuantity,
            actualStock: s.availableQuantity,
            reserveStock: s.reservedQuantity,
            difference: s.availableQuantity - s.stockQuantity,
            lastTake: s.lastStockTake?.toLocaleDateString("ar-EG"),
          })),
        };
        break;
      }

      case "purchases": {
        templateFile = "purchases-report.html";
        const purchases = await prisma.invoice.findMany({
          where: {
            companyId: user.companyId,
            warehouseId: warehouseId,
            ...(branchId && { branchId }),
            supplierId: suppliersId,
            sale_type: {
              notIn: ["SALE", "RETURN_SALE"],
            },
            invoiceDate: createDateFilter(fromDate, toDate),
          },
          include: {
            supplier: true,
            items: { include: { product: true } },
          },
        });

        data = {
          ...baseData,
          purchases: purchases.flatMap((p) =>
            p.items.map((item) => ({
              id: p.invoiceNumber,
              date: p.invoiceDate.toLocaleDateString("ar-EG"),
              supplier: p.supplier?.name,
              product: item.product.name,
              quantity: item.quantity,
              unitPrice: Number(item.price),
              total: Number(item.totalPrice),
              status: p.status,
            })),
          ),
          totalPurchases: purchases.reduce((sum, p) => {
            const purchaseTotal = p.items.reduce(
              (itemSum, item) => itemSum + Number(item.totalPrice || 0),
              0,
            );
            return sum + purchaseTotal;
          }, 0),
        };
        break;
      }

      case "purchase-returns": {
        templateFile = "purchase-returns-report.html";
        const returns = await prisma.invoice.findMany({
          where: {
            companyId: user.companyId,
            warehouseId: warehouseId,
            ...(branchId && { branchId }),
            invoiceDate: createDateFilter(fromDate, toDate),
            sale_type: "RETURN_PURCHASE",
          },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    name: true,
                    stockMovements: { select: { reason: true } },
                  },
                },
              },
            },
            supplier: true,
          },
        });

        data = {
          ...baseData,
          returns: returns.flatMap((r) =>
            r.items.map((item) => ({
              id: r.id,
              date: r.invoiceDate.toLocaleDateString("ar-EG"),
              supplier: r.supplier?.name,
              product: item.product.name,
              quantity: item.quantity,
              reason: item.product.stockMovements.find((p) => p.reason),
              total: Number(item.totalPrice),
            })),
          ),
          totalReturns: returns.reduce(
            (sum, r) => sum + Number(r.totalAmount),
            0,
          ),
        };
        break;
      }

      case "suppliers": {
        templateFile = "suppliers-report.html";
        const suppliers = await prisma.supplier.findMany({
          where: {
            companyId: user.companyId,
          },
          include: {
            _count: { select: { invoice: true } },
          },
        });
        console.log("suppliers", suppliers);
        data = {
          ...baseData,
          suppliers: suppliers.map((s) => ({
            name: s.name,
            phone: s.phoneNumber,
            email: s.email,
            purchaseCount: s._count.invoice,
            balance: Number(s.outstandingBalance || 0),
          })),
          totalSuppliers: suppliers.length,
        };
        break;
      }

      case "supplier-balance": {
        templateFile = "supplier-balance-report.html";

        const suppliers = await prisma.supplier.findMany({
          where: { companyId: user.companyId },
          select: { id: true, name: true, phoneNumber: true },
        });

        // 1. Define an interface for our accumulator to fix the "index signature" error
        interface CurrencyTotal {
          onHim: number;
          forHim: number;
          count: number;
        }

        interface CurrencyGroups {
          [key: string]: CurrencyTotal;
        }

        const reportData: any[] = [];

        for (const s of suppliers) {
          const entries = await prisma.journalLine.findMany({
            where: {
              companyId: user.companyId,
              header: {
                referenceId: s.id,
                ...(branchId && { branchId }),
              },
            },
            select: {
              debit: true,
              credit: true,
              currencyCode: true,
              foreignAmount: true,
              header: { select: { referenceType: true } },
            },
          });

          if (entries.length === 0) continue;

          // 2. Add types to the reduce function to fix "any" and "unknown" errors
          const currencyTotals = entries.reduce<CurrencyGroups>(
            (acc, entry) => {
              // Ensure currency_code is a string, default to "Local"
              const code: string = entry.currencyCode ?? "Local";

              if (!acc[code]) {
                acc[code] = { onHim: 0, forHim: 0, count: 0 };
              }

              let amount = 0;
              if (entry.foreignAmount && Number(entry.foreignAmount) !== 0) {
                amount = Math.abs(Number(entry.foreignAmount));
              } else {
                amount =
                  Number(entry.debit) > 0
                    ? Number(entry.debit)
                    : Number(entry.credit);
              }

              if (Number(entry.debit) > 0) {
                acc[code].onHim += amount;
              } else {
                acc[code].forHim += amount;
              }

              const refType = entry.header?.referenceType?.toLowerCase() ?? "";
              if (["purchase", "invoice"].includes(refType)) {
                acc[code].count += 1;
              }

              return acc;
            },
            {},
          );

          // 3. Object.entries will now recognize "totals" as CurrencyTotal
          for (const [currency, totals] of Object.entries(currencyTotals)) {
            const balance = totals.forHim - totals.onHim;

            reportData.push({
              name: s.name,
              phone: s.phoneNumber ?? "-", // Fix for "string | undefined" error
              currency: currency,
              onHim: totals.onHim.toFixed(2),
              forHim: totals.forHim.toFixed(2),
              balance: balance.toFixed(2),
              purchaseCount: totals.count,
            });
          }
        }

        data = {
          ...baseData,
          suppliers: reportData,
          grandTotal: reportData
            .reduce((sum, item) => sum + Number(item.balance), 0)
            .toFixed(2),
        };
        break;
      }
      case "payments": {
        templateFile = "payments-report.html";
        const paymentsRaw = await prisma.financialTransaction.findMany({
          where: {
            supplierId: suppliersId,
            customerId: customerId,
            companyId: user.companyId,
            ...(branchId && { branchId }),
            type: paymentTypes,
            createdAt: createDateFilter(fromDate, toDate),
          },
          select: {
            customer: { select: { name: true } },
            createdAt: true,
            supplier: { select: { name: true } },
            amount: true,
            currencyCode: true,
            voucherNumber: true,
            type: true,
            paymentMethod: true,
          },
        });

        // Grouping logic
        const groupedPayments = paymentsRaw.reduce((acc: any, p) => {
          const currency = p.currencyCode || "N/A";
          if (!acc[currency]) {
            acc[currency] = {
              currency: currency,
              items: [],
              total: 0,
            };
          }

          acc[currency].items.push({
            name:
              p.type === "RECEIPT"
                ? baseData.company.name
                : (p.customer?.name ?? p.supplier?.name ?? "N/A"),
            voucherNumber: p.voucherNumber,
            amount: Number(p.amount).toFixed(2),
            type: p.type === "PAYMENT" ? "دفعة" : "استلام",
            method: p.paymentMethod,
            date: p.createdAt.toLocaleDateString("ar-EG"),
          });

          acc[currency].total += Number(p.amount);
          return acc;
        }, {});

        data = {
          ...baseData,
          // Convert the object groups into an array for Handlebars
          currencyGroups: Object.values(groupedPayments).map((group: any) => ({
            ...group,
            total: group.total.toFixed(2),
          })),
          period: {
            from: fromDate,
            to: toDate,
          },
        };
        break;
      }
      case "expenses": {
        templateFile = "expenses-report.html";
        const expenses = await prisma.expenses.findMany({
          where: {
            company_id: user.companyId,
            ...(branchId && { branchId }),
            created_at: createDateFilter(fromDate, toDate),
          },
          include: {
            users: { select: { name: true } },
          },
        });

        data = {
          ...baseData,
          expenses: expenses.map((e) => ({
            date: e.created_at?.toLocaleDateString("ar-EG") ?? "",
            category: e.notes,

            expense_number: e.expense_number,
            description: e.description || "-",
            amount: Number(e.amount),
            user: e.users?.name || "غير معروف",
            paymentMethod: e.payment_method,
          })),
          totalExpenses: expenses.reduce((sum, e) => sum + Number(e.amount), 0),
        };
        break;
      }

      // case "cash-register": {
      //   templateFile = "cash-register-report.html";
      //   const cashTransactions = await prisma.cashRegister.findMany({
      //     where: {
      //       companyId: user.companyId,
      //       createdAt: createDateFilter(fromDate, toDate),
      //     },
      //     orderBy: { createdAt: "desc" },
      //   });

      //   const opening = cashTransactions[0]?.openingBalance || 0;
      //   const closing = cashTransactions[cashTransactions.length - 1]?.closingBalance || 0;

      //   data = {
      //     ...baseData,
      //     transactions: cashTransactions.map((t) => ({
      //       date: t.createdAt.toLocaleDateString("ar-EG"),
      //       type: t.transactionType,
      //       amount: Number(t.amount),
      //       balance: Number(t.closingBalance),
      //       reference: t.referenceNumber || "-",
      //     })),
      //     openingBalance: opening,
      //     closingBalance: closing,
      //   };
      //   break;
      // }

      // case "tax": {
      //   templateFile = "tax-report.html";
      //   const sales = await prisma.sale.findMany({
      //     where: {
      //       companyId: user.companyId,
      //       createdAt: createDateFilter(fromDate, toDate),
      //     },
      //   });

      //   data = {
      //     ...baseData,
      //     sales: sales.map((s) => ({
      //       date: s.createdAt.toLocaleDateString("ar-EG"),
      //       total: Number(s.totalAmount),
      //       tax: Number(s.taxAmount || 0),
      //       netAmount: Number(s.totalAmount) - Number(s.taxAmount || 0),
      //     })),
      //     totalSales: sales.reduce((sum, s) => sum + Number(s.totalAmount), 0),
      //     totalTax: sales.reduce((sum, s) => sum + Number(s.taxAmount || 0), 0),
      //   };
      //   break;
      // }

      case "customers": {
        templateFile = "customers-report.html";
        const mappings = await prisma.account_mappings.findMany({
          where: { company_id: user.companyId, is_default: true },
          select: { mapping_type: true, account_id: true },
        });
        const arAccount = mappings.find(
          (m) => m.mapping_type === "accounts_receivable",
        )?.account_id;
        if (!arAccount) {
          return new Response(
            JSON.stringify({ error: "Accounts receivable not mapped" }),
            { status: 400 },
          );
        }

        const customers = await prisma.customer.findMany({
          where: {
            companyId: user.companyId,
            ...(branchId && { branch_id: branchId }),

            updatedAt: createDateFilter(fromDate, toDate),
            ...(customerId && { id: customerId }),
          },
          select: { id: true, name: true, phoneNumber: true },
        });

        // 1. Define interfaces to stop index signature errors
        interface CurrencyTotal {
          onHim: number; // Debit (المدين - عليه)
          forHim: number; // Credit (الدائن - له)
        }

        interface CurrencyGroups {
          [key: string]: CurrencyTotal;
        }

        const customerReportData: any[] = [];

        for (const c of customers) {
          const invoiceIds = await prisma.invoice.findMany({
            where: { companyId: user.companyId, customerId: c.id },
            select: { id: true },
          });
          const invoiceIdList = invoiceIds.map((i) => i.id);

          // 2. Fetch all posted journal lines for the customer
          const mergedEntries = await prisma.journalLine.findMany({
            where: {
              companyId: user.companyId,
              accountId: arAccount,
              header: {
                referenceId: { in: invoiceIdList },
                status: "POSTED",
                ...(branchId && { branchId }),
              },
            },
            select: {
              debit: true,
              credit: true,
              currencyCode: true,
              foreignAmount: true,
            },
          });

          if (mergedEntries.length === 0) continue;

          // 3. Group by currency with strict typing
          const currencyTotals = mergedEntries.reduce<CurrencyGroups>(
            (acc, entry) => {
              const code: string = entry.currencyCode ?? "Local";

              if (!acc[code]) {
                acc[code] = { onHim: 0, forHim: 0 };
              }

              // Logic: Use foreign_amount if available
              let amount = 0;
              if (entry.foreignAmount && Number(entry.foreignAmount) !== 0) {
                amount = Math.abs(Number(entry.foreignAmount));
              } else {
                amount =
                  Number(entry.debit) > 0
                    ? Number(entry.debit)
                    : Number(entry.credit);
              }

              // Customer Logic: Debit = On Him, Credit = For Him
              if (Number(entry.debit) > 0) {
                acc[code].onHim += amount;
              } else {
                acc[code].forHim += amount;
              }

              return acc;
            },
            {},
          );

          // 4. Flatten the groups into the report data
          for (const [currency, totals] of Object.entries(currencyTotals)) {
            const balance = totals.onHim - totals.forHim; // Debit - Credit

            customerReportData.push({
              name: c.name,
              phone: c.phoneNumber ?? "-",
              currency: currency,
              onHim: totals.onHim.toFixed(2), // عليه
              forHim: totals.forHim.toFixed(2), // له
              outstanding: balance.toFixed(2), // المتبقي
            });
          }
        }

        data = {
          ...baseData,
          customers: customerReportData,
          totalOutstandingLocal: customerReportData
            .filter((item) => item.currency === "Local")
            .reduce((sum, item) => sum + Number(item.outstanding), 0)
            .toFixed(2),
        };
        break;
      }
      case "user-activities": {
        templateFile = "user-activities.html";
        const where: any = {
          companyId: user.companyId,
          createdAt: createDateFilter(fromDate, toDate),
        };

        if (scopedUserId) {
          where.userId = scopedUserId;
        }

        const useractivities = await prisma.activityLogs.findMany({
          where,
          select: {
            details: true,
            action: true,
            userAgent: true,
            user: { select: { name: true } },
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        });

        // Grouping logic
        const date = useractivities.map((a) => a.createdAt);
        data = {
          ...baseData,
          // Convert the object groups into an array for Handlebars
          useractivities: useractivities.map((activity: any) => ({
            username: activity.user.name,
            details: activity.details,
            action: activity.action,
            userAgent: activity.userAgent,
            createdAt: activity.createdAt.toLocaleString("ar-EG", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: true, // أو false لو تريد 24 ساعة
            }),
          })),
          period: {
            from:
              date.length > 0
                ? new Date(
                    Math.min(...date.map((d) => d.getTime())),
                  ).toLocaleDateString("ar-EG")
                : fromDate,
            to:
              date.length > 0
                ? new Date(
                    Math.max(...date.map((d) => d.getTime())),
                  ).toLocaleDateString("ar-EG")
                : toDate,
          },
        };
        break;
      }
      case "customer-debts": {
        templateFile = "customer-debts-report.html";
        const customers = await prisma.customer.findMany({
          where: {
            companyId: user.companyId,
            outstandingBalance: { gt: 0 },
            ...(branchId && { branch_id: branchId }),
            ...(customerId && { id: customerId }),
          },
        });

        data = {
          ...baseData,
          customers: customers.map((c) => ({
            name: c.name,
            phone: c.phoneNumber,
            outstanding: Number(c.outstandingBalance),
          })),
          totalDebts: customers.reduce(
            (sum, c) => sum + Number(c.outstandingBalance),
            0,
          ),
        };
        break;
      }
      case "customer_statment": {
        templateFile = "customer_statment.html";
        const mappings = await prisma.account_mappings.findMany({
          where: { company_id: user.companyId, is_default: true },
          select: { mapping_type: true, account_id: true },
        });
        const arAccount = mappings.find(
          (m) => m.mapping_type === "accounts_receivable",
        )?.account_id;
        if (!arAccount) {
          return new Response(
            JSON.stringify({ error: "Accounts receivable not mapped" }),
            { status: 400 },
          );
        }
        const fiscalYear = await prisma.fiscal_periods.findFirst({
          where: {
            company_id: user.companyId,
            is_closed: false,
          },
          select: { start_date: true, end_date: true },
        });
        if (!fiscalYear) return;
        const fromDate = new Date(fiscalYear.start_date);
        fromDate.setHours(0, 0, 0, 0); // Start of day

        const toDate = new Date(fiscalYear.end_date);
        toDate.setHours(23, 59, 59, 999); // End of day

        // 1️⃣ جلب العملاء (عميل واحد أو الجميع)
        const customers = await prisma.customer.findMany({
          where: customerId
            ? {
                id: customerId,
                companyId: user.companyId,
                ...(branchId && { branch_id: branchId }),
              }
            : {
                companyId: user.companyId,
                outstandingBalance: { gt: 0 },
                ...(branchId && { branch_id: branchId }),
              },
          select: { id: true, name: true, phoneNumber: true },
        });

        const allStatements = []; // This will hold each separate page

        for (const c of customers) {
          const invoiceIds = await prisma.invoice.findMany({
            where: { companyId: user.companyId, customerId: c.id },
            select: { id: true },
          });
          const paymentIds = await prisma.financialTransaction.findMany({
            where: {
              companyId: user.companyId,
              customerId: c.id,
            },
            select: { id: true },
          });
          const invoiceIdList = invoiceIds.map((i) => i.id);
          const paymentIdList = paymentIds.map((p) => p.id);
          const customerReferenceIds = [
            c.id,
            ...invoiceIdList,
            ...paymentIdList,
          ];

          // Find all unique currencies this customer has used in posted journal headers
          const lineCurrencies = await prisma.journalLine.findMany({
            where: {
              companyId: user.companyId,
              accountId: arAccount,
              header: {
                referenceId: { in: customerReferenceIds },
                ...(branchId && { branchId }),
              },
            },
            distinct: ["currencyCode"],
            select: { currencyCode: true },
          });

          const currencySet = new Set<string | null>([
            ...lineCurrencies.map((x) => x.currencyCode ?? null),
          ]);

          for (const currCode of currencySet) {
            const currencyCode = currCode || "Local";

            // 1. Get Opening Balance for THIS currency
            const openingLines = await prisma.journalLine.findMany({
              where: {
                companyId: user.companyId,
                accountId: arAccount,
                currencyCode: currCode ?? null,
                header: {
                  referenceId: { in: customerReferenceIds },
                  ...(branchId && { branchId }),
                  entryDate: { lt: fromDate },
                },
              },
            });

            const openingBalance = openingLines.reduce((sum, e) => {
              const val = e.foreignAmount
                ? Number(e.foreignAmount)
                : Number(e.debit) - Number(e.credit);
              return sum + val;
            }, 0);
            // 2. Get Period Entries for THIS currency
            const lines = await prisma.journalLine.findMany({
              where: {
                companyId: user.companyId,
                accountId: arAccount,
                currencyCode: currCode ?? null,
                header: {
                  referenceId: { in: customerReferenceIds },
                  ...(branchId && { branchId }),
                  entryDate: { gte: fromDate, lte: toDate },
                },
              },
              orderBy: { header: { entryDate: "asc" } },
              include: {
                header: true,
              },
            });

            const combinedEntries = [
              ...lines.map((entry) => ({
                date: entry.header?.entryDate,
                debit: Number(entry.debit),
                credit: Number(entry.credit),
                foreignAmount: entry.foreignAmount,
                description: entry.memo ?? entry.header?.description,
                docNo: entry.header?.entryNumber,
                typeName: mapType(entry.header?.referenceType ?? null),
              })),
            ].sort((a, b) => {
              const aTime = a.date ? new Date(a.date).getTime() : 0;
              const bTime = b.date ? new Date(b.date).getTime() : 0;
              return aTime - bTime;
            });

            let runningBalance = openingBalance;
            const transactions = combinedEntries.map((entry) => {
              const isDebit = Number(entry.debit) > 0;
              // Use foreign_amount if available
              const amount = entry.foreignAmount
                ? Math.abs(Number(entry.foreignAmount))
                : isDebit
                  ? Number(entry.debit)
                  : Number(entry.credit);

              const dVal = isDebit ? amount : 0;
              const cVal = !isDebit ? amount : 0;
              runningBalance = runningBalance + dVal - cVal;

              return {
                date: entry.date
                  ? new Date(entry.date).toLocaleDateString("ar-EG")
                  : "",
                debit: dVal.toFixed(2),
                credit: cVal.toFixed(2),
                balance: runningBalance.toFixed(2),
                description: entry.description,
                docNo: entry.docNo,
                typeName: entry.typeName,
              };
            });

            // Push as a separate statement entry
            allStatements.push({
              customerName: c.name,
              customerPhone: c.phoneNumber,
              currency: currencyCode,
              openingBalance: openingBalance.toFixed(2),
              closingBalance: runningBalance.toFixed(2),
              totalDebit: transactions
                .reduce((s, t) => s + Number(t.debit), 0)
                .toFixed(2),
              totalCredit: transactions
                .reduce((s, t) => s + Number(t.credit), 0)
                .toFixed(2),
              transactions,
              periodFrom: fromDate.toLocaleDateString("ar-EG"),
              periodTo: toDate.toLocaleDateString("ar-EG"),
            });
          }
        }

        data = { statements: allStatements, ...baseData };
        break;
      }
      case "customer-receipts": {
        if (!customerId) {
          return new Response(
            JSON.stringify({ error: "customerId is required" }),
            { status: 400 },
          );
        }

        templateFile = "customer-recepit.html";

        const receiptsRaw = await fetchReceiptsByCustomer(
          customerId,
          user.companyId,
          branchId,
        );

        if (!receiptsRaw.length) {
          data = {
            ...baseData,
            customer: "",
            receipts: [],
          };
          break;
        }

        const receipts = receiptsRaw.map(prepareReceipt);

        data = {
          ...baseData,
          customer: receipts[0]?.customer_name ?? "",
          receipts,
        };

        break;
      }
      case "supplier_statment": {
        templateFile = "supplier_statment.html";
        const mappings = await prisma.account_mappings.findMany({
          where: { company_id: user.companyId, is_default: true },
          select: { mapping_type: true, account_id: true },
        });
        const apAccount = mappings.find(
          (m) => m.mapping_type === "accounts_payable",
        )?.account_id;
        if (!apAccount) {
          return new Response(
            JSON.stringify({ error: "Accounts payable not mapped" }),
            { status: 400 },
          );
        }
        const fiscalYear = await prisma.fiscal_periods.findFirst({
          where: {
            company_id: user.companyId,
            is_closed: false,
          },
          select: { start_date: true, end_date: true },
        });
        if (!fiscalYear) return;
        console.log(suppliersId);
        const fromDate = new Date(fiscalYear.start_date);
        fromDate.setHours(0, 0, 0, 0); // Start of day

        const toDate = new Date(fiscalYear.end_date);
        toDate.setHours(23, 59, 59, 999); // End of day

        // 1️⃣ جلب العملاء (عميل واحد أو الجميع)
        const suppliers = suppliersId
          ? await prisma.supplier.findMany({
              where: {
                id: suppliersId,
                companyId: user.companyId,
              },
              select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                address: true,
                city: true,
              },
            })
          : await prisma.supplier.findMany({
              where: {
                companyId: user.companyId,
                outstandingBalance: { gt: 0 },
              },
              select: {
                id: true,
                name: true,
                phoneNumber: true,

                outstandingBalance: true,
              },
            });
        const supplierInvoiceIds = await prisma.invoice.findMany({
          where: {
            companyId: user.companyId,
            supplierId: suppliersId,
            sale_type: "PURCHASE",
          },
          select: { id: true },
        });

        const supplierPaymentIds = await prisma.financialTransaction.findMany({
          where: { companyId: user.companyId, supplierId: suppliersId },
          select: { id: true },
        });
        // 2️⃣ تجهيز كشف حساب لكل عميل
        const supplierStatements = [];

        for (const c of suppliers) {
          // رصيد افتتاحي
          const supplierReferenceIds = [
            c.id,
            ...supplierInvoiceIds.map((invoice) => invoice.id),
            ...supplierPaymentIds.map((payment) => payment.id),
          ];

          const openingEntries = await prisma.journalLine.findMany({
            where: {
              companyId: user.companyId,
              accountId: apAccount,
              header: {
                referenceId: { in: supplierReferenceIds },
                ...(branchId && { branchId }),
                entryDate: { lt: fromDate },
              },
            },
            select: { debit: true, credit: true },
          });
          const openingBalance = openingEntries.reduce(
            (sum, e) => sum + Number(e.credit) - Number(e.debit),
            0,
          );
          // قيود الفترة
          const entries = await prisma.journalLine.findMany({
            where: {
              companyId: user.companyId,
              accountId: apAccount,
              header: {
                referenceId: { in: supplierReferenceIds },
                ...(branchId && { branchId }),
                entryDate: { gte: fromDate, lte: toDate },
              },
            },
            orderBy: { header: { entryDate: "asc" } },
            select: {
              id: true,
              debit: true,
              credit: true,
              memo: true,
              header: {
                select: {
                  entryDate: true,
                  description: true,
                  entryNumber: true,
                  referenceType: true,
                },
              },
            },
          });

          // بناء كشف الحساب
          let runningBalance: number = 0;
          const transactions = entries.map((entry) => {
            runningBalance =
              runningBalance + Number(entry.credit) - Number(entry.debit);

            return {
              date: entry.header?.entryDate?.toLocaleDateString("ar-EG"),
              debit: Number(entry.debit),
              credit: Number(entry.credit),
              balance: runningBalance.toFixed(2),
              description: entry.memo ?? entry.header?.description,
              docNo: entry.header?.entryNumber,
              typeName: mapType(entry.header?.referenceType ?? null),
            };
          });
          const totalDebit = transactions.reduce((s, t) => s + t.debit, 0);
          const totalCredit = transactions.reduce((s, t) => s + t.credit, 0);
          const periodDebit = transactions.reduce((s, t) => s + t.debit, 0);
          const periodCredit = transactions.reduce((s, t) => s + t.credit, 0);

          // المنطق المطلوب: إضافة الرصيد الافتتاحي للإجمالي المناسب بناءً على حالته
          // إذا كان الرصيد الافتتاحي موجب (Credit) يضاف للدائن، وإذا كان سالب (Debit) يضاف للمدين
          const finalTotalDebit =
            openingBalance < 0
              ? periodDebit + Math.abs(openingBalance)
              : periodDebit;
          const finalTotalCredit =
            openingBalance > 0 ? periodCredit + openingBalance : periodCredit;

          supplierStatements.push({
            supplier: c,

            openingBalance,
            closingBalance: openingBalance + totalCredit - totalDebit,
            totalDebit: finalTotalDebit.toFixed(2),
            totalCredit: finalTotalCredit.toFixed(2),
            transactions,
            period: {
              from:
                fromDate instanceof Date
                  ? fromDate.toLocaleDateString("ar-EG")
                  : fromDate,
              to:
                toDate instanceof Date
                  ? toDate.toLocaleDateString("ar-EG")
                  : toDate,
            },
          });
        }

        // 3️⃣ إخراج التقرير
        data = {
          suppliers: supplierStatements,
          period: { from: fromDisplay, to: toDisplay },
          ...baseData,
        };

        break;
      }
      case "supplier-receipts": {
        if (!suppliersId) {
          return new Response(
            JSON.stringify({ error: "supplierId is required" }),
            { status: 400 },
          );
        }

        templateFile = "purches-receipt.html";

        const receiptsRaw = await fetchReceiptsBySupplier(
          suppliersId,
          user.companyId,
          branchId,
        );

        if (!receiptsRaw.length) {
          data = {
            ...baseData,
            purchases: [],
          };
          break;
        }

        const purchases = receiptsRaw.map(preparePurchaseReceipt);

        data = {
          ...baseData,
          purchases,
        };

        break;
      }
      case "accounts-statement": {
        if (!id) {
          return new Response(
            JSON.stringify({ error: "accountId is required" }),
            { status: 400 },
          );
        }

        templateFile = "account-statement.html";

        const fiscalYear = await prisma.fiscal_periods.findFirst({
          where: {
            company_id: user.companyId,
            is_closed: false,
          },
          select: { start_date: true, end_date: true },
        });

        if (!fiscalYear) {
          return new Response(
            JSON.stringify({ error: "No open fiscal year" }),
            { status: 400 },
          );
        }

        const fromDate = new Date(fiscalYear.start_date);
        fromDate.setHours(0, 0, 0, 0);

        const toDate = new Date(fiscalYear.end_date);
        toDate.setHours(23, 59, 59, 999);

        const rows = await fetchAccountStatement({
          accountId: id,
          companyId: user.companyId,
          fromDate,
          toDate,
          branchId,
        });

        let runningBalance = 0;

        const transactions = rows.map((r: any, i: number) => {
          runningBalance += Number(r.debit) - Number(r.credit);
          return {
            ...prepareAccountStatement(r, i),
            balance: runningBalance.toFixed(2),
          };
        });
        console.log("Account Statement Rows:", rows);
        const totalDebit = rows.reduce(
          (s: number, r: any) => s + Number(r.debit || 0),
          0,
        );
        const totalCredit = rows.reduce(
          (s: number, r: any) => s + Number(r.credit || 0),
          0,
        );

        data = {
          ...baseData,
          accounts: [
            // نغلف البيانات بمصفوفة accounts كما يتوقع القالب
            {
              account: {
                name:
                  rows[0]?.accountName || rows[0]?.account_name || "حساب عام",
                code: rows[0]?.accountCode || rows[0]?.account_code || "",
                currency:
                  rows[0]?.currency || rows[0]?.account_currency || "EGP",
              },

              from: fromDate.toLocaleDateString("ar-EG"),
              to: toDate.toLocaleDateString("ar-EG"),
              transactions: transactions,
              totalDebit: totalDebit.toFixed(2),
              totalCredit: totalCredit.toFixed(2),
              closingBalance: (totalDebit - totalCredit).toFixed(2),
            },
          ],
        };

        break;
      }

      case "customer-payments": {
        templateFile = "customer-payments-report.html";
        const payments = await prisma.financialTransaction.findMany({
          where: {
            ...(!isAdmin ? { userId: user.userId } : {}),
            companyId: user.companyId,
            ...(branchId && { branchId }),
            type: "PAYMENT",
            createdAt: createDateFilter(fromDate, toDate),
            ...(customerId && { customerId }),
          },
          include: { customer: true },
        });

        data = {
          ...baseData,
          payments: payments.map((p) => ({
            date: p.createdAt.toLocaleDateString("ar-EG"),
            customer: p.customer?.name,
            amount: Number(p.amount),
            method: p.paymentMethod,
          })),
          totalPayments: payments.reduce((sum, p) => sum + Number(p.amount), 0),
        };
        break;
      }
      case "bank-statment": {
        templateFile = "bank_statment.html";

        // 1️⃣ جلب العملاء (عميل واحد أو الجميع)
        const accountid = accountId;
        const bank = await prisma.bank.findFirst({
          where: { accountId: accountId, companyId: user.companyId },
          select: {
            id: true,
            name: true,
            accountNumber: true,
            accountId: true,
            account: { select: { opening_balance: true } },
          },
        });

        if (!bank) {
          return new Response(
            JSON.stringify({ error: " اسم البنك غير موجود" }),
            { status: 400 },
          );
        }
        // 2️⃣ تجهيز كشف حساب لكل عميل
        const customerStatements = [];
        for (const c of bank ? [bank] : []) {
          // رصيد افتتاحي

          // قيود الفترة
          const entries = await prisma.journalLine.findMany({
            where: {
              companyId: user.companyId,
              accountId: bank.accountId,
              header: {
                ...(branchId && { branchId }),
                entryDate: { gte: fromDate, lte: toDate },
              },
            },
            orderBy: { header: { entryDate: "asc" } },
            select: {
              id: true,
              debit: true,
              credit: true,
              memo: true,
              header: {
                select: {
                  entryDate: true,
                  description: true,
                  entryNumber: true,
                  referenceType: true,
                },
              },
            },
          });

          // بناء كشف الحساب
          let runningBalance: number = 0;
          const transactions = entries.map((entry) => {
            runningBalance =
              runningBalance + Number(entry.debit) - Number(entry.credit);

            return {
              date: entry.header?.entryDate?.toLocaleDateString("ar-EG"),
              debit: Number(entry.debit),
              credit: Number(entry.credit),
              balance: runningBalance.toFixed(2),
              description: entry.memo ?? entry.header?.description,
              docNo: entry.header?.entryNumber,
              typeName: mapType(entry.header?.referenceType ?? null),
            };
          });

          const totalDebit = transactions.reduce((s, t) => s + t.debit, 0);
          const totalCredit = transactions.reduce((s, t) => s + t.credit, 0);
          const closingBalance = Math.abs(totalDebit - totalCredit);

          customerStatements.push({
            bank: c,

            closingBalance: closingBalance.toFixed(2),
            totalDebit: totalDebit.toFixed(2),
            totalCredit: totalCredit.toFixed(2),
            transactions,
            period: { from: fromDisplay, to: toDisplay },
          });
        }
        // 3️⃣ إخراج التقرير
        data = {
          bank: customerStatements,
          period: { from: fromDisplay, to: toDisplay },
          ...baseData,
        };

        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid report type" }), {
          status: 400,
        });
    }
    console.log(id);
    /* ==================== PDF GENERATION ==================== */
    const templatePath = path.join(
      process.cwd(),
      "public/templates",
      templateFile,
    );
    const htmlTemplate = fs.readFileSync(templatePath, "utf8");
    const template = Handlebars.compile(htmlTemplate);
    const html = template(data);

    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: ["domcontentloaded", "load"],
      timeout: 60000,
    });
    await page.evaluateHandle("document.fonts.ready");
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${reportType}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("PDF Error:", err);
    return new Response(
      JSON.stringify({ error: "PDF generation failed", details: err.message }),
      { status: 500 },
    );
  }
}
async function fetchReceiptsByCustomer(
  customerId: string,
  companyId: string,
  branchId?: string,
) {
  const invoices = await prisma.invoice.findMany({
    where: {
      customerId,
      companyId,
      ...(branchId && { branchId }),
      sale_type: { in: ["SALE", "RETURN_SALE"] },
    },
    orderBy: {
      invoiceDate: "asc",
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          outstandingBalance: true,
        },
      },
      cashier: {
        select: {
          name: true,
        },
      },
      warehouse: {
        select: {
          name: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  return invoices.map((inv) => ({
    sale_id: inv.id,
    sale_number: inv.invoiceNumber,

    subtotal: inv.totalAmount, // keep name
    total_amount: inv.totalAmount,
    amount_paid: inv.amountPaid,
    discount_amount: 0, // if you add discount later, map it here
    sale_type: inv.sale_type == "SALE" ? "بيع" : "مرتجع مبيعات",

    created_at: inv.invoiceDate,

    customer_name: inv.customer?.name ?? "",
    outstanding_balance: inv.customer?.outstandingBalance ?? 0,
    cashier_name: inv.cashier?.name ?? "",

    items: inv.items.map((item) => ({
      name: item.product.name,
      warehousename: inv.warehouse?.name ?? "",

      selectedQty: item.quantity,
      sellingUnit: item.unit?.toLowerCase() ?? "unit",

      // 🔑 FRONTEND EXPECTS THIS NAME
      pricePerUnit: item.price,
    })),
  }));
}

function prepareReceipt(receipt: any) {
  const createdAt = new Date(receipt.created_at);

  const items = (receipt.items ?? []).map((item: any, i: number) => {
    const unit = (item.sellingUnit ?? "unit").toLowerCase();

    const price = Number(item.pricePerUnit || 0);
    const qty = Number(item.selectedQty || 0);

    return {
      index: i + 1,
      name: item.name,
      warehousename: item.warehousename ?? "",
      selectedQty: qty,
      sellingUnitArabic: unit,
      price: price.toFixed(2),
      total: (price * qty).toFixed(2),
    };
  });

  return {
    sale_number: receipt.sale_number,
    customer_name: receipt.customer_name,
    cashier_name: receipt.cashier_name,
    sale_type: receipt.sale_type,

    subtotal: Number(receipt.subtotal || 0).toFixed(2),
    discount: Number(receipt.discount_amount || 0).toFixed(2),
    total: Number(receipt.total_amount || 0).toFixed(2),
    paid: Number(receipt.amount_paid || 0).toFixed(2),

    change: (
      Number(receipt.amount_paid || 0) - Number(receipt.total_amount || 0)
    ).toFixed(2),

    customer_debt: Number(receipt.outstanding_balance || 0).toFixed(2),

    date: createdAt.toLocaleDateString("ar-EG"),
    time: createdAt.toLocaleTimeString("ar-EG"),

    is_cash:
      Number(receipt.amount_paid || 0) >= Number(receipt.total_amount || 0),

    items,
  };
}

async function fetchReceiptsBySupplier(
  supplierId: string,
  companyId: string,
  branchId?: string,
) {
  const invoices = await prisma.invoice.findMany({
    where: {
      supplierId,
      companyId,
      ...(branchId && { branchId }),
      sale_type: { in: ["PURCHASE", "RETURN_PURCHASE"] },
    },
    orderBy: {
      invoiceDate: "asc",
    },
    include: {
      supplier: {
        select: {
          name: true,
        },
      },
      warehouse: {
        select: {
          name: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  // ⬇️ Map to SAME shape your frontend expects
  return invoices.map((inv) => ({
    purchase_id: inv.id,
    purchase_number: inv.invoiceNumber,

    total_amount: inv.totalAmount,
    amount_paid: inv.amountPaid,
    amount_due: inv.amountDue,
    purchase_type: inv.sale_type == "PURCHASE" ? "شراء " : "مرتجع مشتريات",

    currency_code: null, // keep if frontend expects it
    exchange_rate: null, // keep if frontend expects it

    created_at: inv.invoiceDate,
    supplier_name: inv.supplier?.name ?? "",

    items: inv.items.map((item) => ({
      product_name: item.product.name,
      warehouse_name: inv.warehouse?.name ?? "",
      quantity: item.quantity,

      // 🔑 IMPORTANT: keep frontend variable names
      unit_cost: item.price,
      total_cost: item.totalPrice,
    })),
  }));
}

function preparePurchaseReceipt(receipt: any) {
  const createdAt = new Date(receipt.created_at);

  const items = (receipt.items ?? []).map((item: any, i: number) => ({
    index: i + 1,
    product_name: item.product_name,
    warehouse_name: item.warehouse_name ?? "",
    quantity: Number(item.quantity || 0),
    unit: item.unit,

    // frontend names preserved
    unit_cost: Number(item.unit_cost || 0).toFixed(2),
    total_cost: Number(item.total_cost || 0).toFixed(2),
  }));

  return {
    purchase_number: receipt.purchase_number,
    suppliername: receipt.supplier_name,
    purchase_type: receipt.purchase_type,

    is_cash: Number(receipt.amount_due || 0) <= 0,

    total_amount: Number(receipt.total_amount || 0).toFixed(2),
    amount_paid: Number(receipt.amount_paid || 0).toFixed(2),
    amount_due: Number(receipt.amount_due || 0).toFixed(2),

    currency: receipt.currency_code,
    exchange_rate: receipt.exchange_rate,

    date: createdAt.toLocaleDateString("ar-EG"),
    time: createdAt.toLocaleTimeString("ar-EG"),

    items,
  };
}

async function fetchAccountStatement({
  accountId,
  companyId,
  fromDate,
  toDate,
  branchId,
}: {
  accountId: string;
  companyId: string;
  fromDate: Date;
  toDate: Date;
  branchId?: string;
}) {
  // 1. Safety check: Ensure strings are actual strings and not objects
  const safeCompanyId =
    typeof companyId === "object" ? (companyId as any).id : companyId;
  const safeAccountId =
    typeof accountId === "object" ? (accountId as any).id : accountId;

  const branchCondition = branchId ? `AND jh.branch_id::text = $5::text` : "";
  const sql = `
    SELECT 
      jl.id,
      jh.entry_number,
      jh.entry_date,
      jh.description,
      jl.debit,
      jl.credit,
      jh.reference_type,
      jl.currency_code,
      a.account_name_en AS account_name,
      a.account_code AS account_code,
      a.currency_code AS account_currency
    FROM journal_lines jl
    INNER JOIN journal_headers jh 
      ON jl.header_id::text = jh.id::text
    INNER JOIN accounts a 
      ON jl.account_id::text = a.id::text

    WHERE jl.company_id::text = $1::text
      AND jl.account_id::text = $2::text
      AND jh.entry_date BETWEEN $3 AND $4
      AND jh.status = 'POSTED'
      ${branchCondition}

    ORDER BY jh.entry_date ASC, jh.created_at ASC
  `;

  const params = branchId
    ? [safeCompanyId, safeAccountId, fromDate, toDate, branchId]
    : [safeCompanyId, safeAccountId, fromDate, toDate];

  const rows = await prisma.$queryRawUnsafe<any[]>(sql, ...params);

  return rows.map((r) =>
    JSON.parse(
      JSON.stringify(r, (_k, v) => (typeof v === "bigint" ? Number(v) : v)),
    ),
  );
}
function prepareAccountStatement(row: any, index: number) {
  return {
    index: index + 1,
    date: row.entry_date
      ? new Date(row.entry_date).toLocaleDateString("ar-EG")
      : "",
    debit: Number(row.debit || 0).toFixed(2),
    credit: Number(row.credit || 0).toFixed(2),
    description: row.description || "-",
    docNo: row.entry_number || "-",
    typeName: mapType(row.reference_type),
    // الحقول المضافة
    accountName: row.account_name,
    accountCode: row.account_code,
    currency: row.account_currency || row.currency_code,
  };
}
