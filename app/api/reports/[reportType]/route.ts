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
    } = await req.json();

    const fromDate = rawFrom ? new Date(rawFrom).toISOString() : undefined;
    const toDate = rawTo ? new Date(rawTo).toISOString() : undefined;
    const fromDisplay = formatDate(rawFrom);
    const toDisplay = formatDate(rawTo);

    // Auth
    const user = await getSession();
    const company = await getCompany();
    if (!user || !company) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    let data: any = {};
    let templateFile = "";

    const baseData = {
      company: company.data,
      from: fromDisplay,
      to: toDisplay,
      createby: user.name,
      date: new Date().toLocaleDateString("ar-EG"),
    };

    /* ==================== REPORT HANDLERS ==================== */

    switch (reportType) {
      case "sales": {
        templateFile = "sales-report.html";
        const sales = await prisma.invoiceItem.findMany({
          where: {
            companyId: user.companyId,
          },
          include: { product: true, invoice: true },
        });

        data = {
          ...baseData,
          sales: sales.map((s) => ({
            product: s.product.name,
            quantity: s.quantity,
            total: Number(s.totalPrice),
            sellingUnit: s.unit,
          })),
          totalSales: sales.reduce((sum, s) => sum + Number(s.totalPrice), 0),
        };
        break;
      }

      case "sales-by-product": {
        templateFile = "sales-by-product-report.html";
        const salesByProduct = await prisma.invoiceItem.groupBy({
          by: ["productId"],
          where: {
            companyId: user.companyId,
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
          totalSales: salesByProduct.reduce(
            (sum, s) => sum + Number(s._sum.totalPrice || 0),
            0,
          ),
        };
        break;
      }

      case "sales-by-user": {
        templateFile = "sales-by-user-report.html";
        const salesByUser = await prisma.invoice.groupBy({
          by: ["cashierId"],
          where: {
            companyId: user.companyId,
            invoiceDate: createDateFilter(fromDate, toDate),
          },

          _sum: { totalAmount: true },
          _count: { id: true },
        });

        const users = await prisma.user.findMany({
          where: { id: { in: salesByUser.map((s) => s.cashierId) } },
        });

        data = {
          ...baseData,
          salesByUser: salesByUser.map((s) => {
            const userInfo = users.find((u) => u.id === s.cashierId);
            return {
              user: userInfo?.name,
              salesCount: s._count.id,
              total: Number(s._sum.totalAmount),
            };
          }),
          totalSales: salesByUser.reduce(
            (sum, s) => sum + Number(s._sum.totalAmount || 0),
            0,
          ),
        };
        break;
      }

      case "daily-sales": {
        templateFile = "daily-sales-report.html";
        const sales = await prisma.invoice.findMany({
          where: {
            companyId: user.companyId,
            invoiceDate: createDateFilter(fromDate, toDate),
          },
          select: {
            invoiceDate: true,
            totalAmount: true,
          },
        });

        const dailyMap = new Map<
          string,
          { date: string; total: number; count: number }
        >();

        sales.forEach((s) => {
          const date = s.invoiceDate.toLocaleDateString("ar-EG");
          const existing = dailyMap.get(date) || { date, total: 0, count: 0 };
          dailyMap.set(date, {
            date,
            total: existing.total + Number(s.totalAmount),
            count: existing.count + 1,
          });
        });

        data = {
          ...baseData,
          dailySales: Array.from(dailyMap.values()),
          totalSales: sales.reduce((sum, s) => sum + Number(s.totalAmount), 0),
        };
        break;
      }

      case "profit-by-product": {
        templateFile = "profit-by-product-report.html";
        const salesItems = await prisma.invoiceItem.findMany({
          where: {
            companyId: user.companyId,
          },
          include: { product: true },
        });

        const profitByProduct = salesItems.reduce(
          (acc, item) => {
            const cost = Number(item.product.costPrice) * Number(item.quantity);
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
        const [revenueAccounts, cogsAccounts, expenseAccounts] =
          await Promise.all([
            prisma.accounts.findMany({
              where: {
                company_id: user.companyId,
                account_type: "REVENUE",
                updated_at: createDateFilter(fromDate, toDate),
              },
            }),
            prisma.accounts.findMany({
              where: {
                company_id: user.companyId,
                account_type: "EXPENSE",
                account_category: "COST_OF_GOODS_SOLD",
                updated_at: createDateFilter(fromDate, toDate),
              },
            }),
            prisma.accounts.findMany({
              where: {
                company_id: user.companyId,
                account_type: "EXPENSE",
                account_category: { not: "COST_OF_GOODS_SOLD" },
                updated_at: createDateFilter(fromDate, toDate),
              },
            }),
          ]);

        const revenue = revenueAccounts.map((r) => ({
          name: r.account_name_en,
          amount: Number(r.balance),
        }));
        const cogs = cogsAccounts.map((c) => ({
          name: c.account_name_en,
          amount: Number(c.balance),
        }));
        const expenses = expenseAccounts.map((e) => ({
          name: e.account_name_en,
          amount: Number(e.balance),
        }));

        const totalRevenue = revenue.reduce((s, r) => s + r.amount, 0);
        const totalCogs = cogs.reduce((s, c) => s + c.amount, 0);
        const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

        data = {
          ...baseData,
          revenue,
          cogs,
          expenses,
          totalRevenue,
          totalCogs,
          grossProfit: totalRevenue - totalCogs,
          totalExpenses,
          netProfit: totalRevenue - totalCogs - totalExpenses,
        };
        break;
      }

      case "inventory": {
        templateFile = "inventory-report.html";
        const inventory = await prisma.inventory.findMany({
          where: {
            companyId: user.companyId,
            updatedAt: createDateFilter(fromDate, toDate),
          },
          select: {
            product: {
              select: {
                name: true,
                sku: true,
                costPrice: true,
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
          inventory: inventory.map((i) => ({
            product: i.product.name,
            stock: i.availableQuantity,
            supplier: i.product.supplier?.name,
            warehouse: i.warehouse.name,
            lastStockTake: i.lastStockTake?.toLocaleDateString("ar-EG"),
            value: Number(i.product.costPrice) * i.availableQuantity,
          })),
          totalInventoryValue: inventory.reduce(
            (sum, i) => sum + Number(i.product.costPrice) * i.availableQuantity,
            0,
          ),
        };
        break;
      }

      case "low-stock": {
        const rawQuery = Prisma.sql`
          SELECT
            i.id AS inventoryId,
            i."stock_quantity",
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
            i."company_id" = ${user.companyId}
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
        console.log(lowStockRecords);
        templateFile = "out-of-stock-report.html"; // Assume you have a template
        data = {
          lowStockRecords,
          company: company.data,
          date: new Date().toLocaleDateString("ar-EG"),
          createby: user.name,
        };
        break;
      }

      case "stock-movement": {
        templateFile = "stock-movement-report.html";
        const movements = await prisma.stockMovement.findMany({
          where: {
            companyId: user.companyId,
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

        const expiringProducts = await prisma.product.findMany({
          where: {
            companyId: user.companyId,
            expiredAt: {
              lte: thirtyDaysFromNow,
              gte: longTimeAgo,
            },
          },
          select: {
            name: true,
            sku: true,
            expiredAt: true,
            inventory: {
              select: {
                stockQuantity: true,
                warehouse: { select: { name: true } },
              },
            },
          },
          orderBy: { expiredAt: "asc" },
        });

        data = {
          ...baseData,
          expiringProducts: expiringProducts.map((p) => {
            const daysDiff = Math.ceil(
              (p.expiredAt.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
            );
            let status = "Unknown";
            if (daysDiff < 0) status = "Expired";
            else if (daysDiff <= 3) status = "Expiring Soon (3 Days)";
            else if (daysDiff <= 30) status = "Expiring (30 Days)";

            return {
              name: p.name,
              sku: p.sku,
              expiryDate: p.expiredAt.toLocaleDateString("ar-EG"),
              stock: p.inventory[0]?.stockQuantity ?? 0,
              warehouse: p.inventory[0]?.warehouse?.name ?? "N/A",
              daysUntilExpiry: daysDiff,
              status,
            };
          }),
        };
        break;
      }

      case "stock-take": {
        templateFile = "stock-take-report.html";
        const stockTake = await prisma.inventory.findMany({
          where: {
            companyId: user.companyId,
            lastStockTake: createDateFilter(fromDate, toDate),
          },
          include: {
            product: true,
            warehouse: true,
          },
        });
        console.log("stockTake", stockTake);
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
              id: p.id,
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
        };
        break;
      }

      case "supplier-balance": {
        templateFile = "supplier-balance-report.html";
        const suppliers = await prisma.supplier.findMany({
          where: {
            companyId: user.companyId,
            outstandingBalance: { gt: 0 },
          },
        });

        data = {
          ...baseData,
          suppliers: suppliers.map((s) => ({
            name: s.name,
            phone: s.phoneNumber,
            balance: Number(s.outstandingBalance),
          })),
          totalBalance: suppliers.reduce(
            (sum, s) => sum + Number(s.outstandingBalance),
            0,
          ),
        };
        break;
      }

      case "payments": {
        templateFile = "payments-report.html";
        const payments = await prisma.financialTransaction.findMany({
          where: {
            companyId: user.companyId,
            createdAt: createDateFilter(fromDate, toDate),
          },
          select: {
            customer: true,
            createdAt: true,
            amount: true,
            type: true,
            paymentMethod: true,
          },
        });

        data = {
          ...baseData,
          payments: payments.map((p) => ({
            payee: p.type,
            name: p.customer?.name ?? "",
            amount: p.amount,
            method: p.paymentMethod,
            date: p.createdAt.toLocaleDateString("ar-EG"),
          })),
          totalPayments: payments.reduce((sum, p) => sum + Number(p.amount), 0),
        };
        break;
      }

      case "expenses": {
        templateFile = "expenses-report.html";
        const expenses = await prisma.expenses.findMany({
          where: {
            company_id: user.companyId,
            created_at: createDateFilter(fromDate, toDate),
          },
        });

        data = {
          ...baseData,
          expenses: expenses.map((e) => ({
            // date: e.created_at.toLocaleDateString("ar-EG")??'',
            category: e.notes,
            description: e.description || "-",
            amount: Number(e.amount),
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
        const customers = await prisma.customer.findMany({
          where: {
            companyId: user.companyId,
            updatedAt: createDateFilter(fromDate, toDate),
            ...(customerId && { id: customerId }),
          },
        });

        data = {
          ...baseData,
          customers: customers.map((c) => ({
            name: c.name,
            phone: c.phoneNumber,
            balance: c.balance,
            outstanding: c.outstandingBalance,
          })),
        };
        break;
      }

      case "customer-debts": {
        templateFile = "customer-debts-report.html";
        const customers = await prisma.customer.findMany({
          where: {
            companyId: user.companyId,
            outstandingBalance: { gt: 0 },
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
        const customers = customerId
          ? await prisma.customer.findMany({
              where: {
                id: customerId,
                companyId: user.companyId,
              },
              select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                address: true,
                city: true,
                balance: true,
                outstandingBalance: true,
              },
            })
          : await prisma.customer.findMany({
              where: {
                companyId: user.companyId,
                outstandingBalance: { gt: 0 },
              },
              select: {
                id: true,
                name: true,
                phoneNumber: true,
                balance: true,
                outstandingBalance: true,
              },
            });

        // 2️⃣ تجهيز كشف حساب لكل عميل
        const customerStatements = [];

        for (const c of customers) {
          // رصيد افتتاحي
          const openingEntries = await prisma.journal_entries.findMany({
            where: {
              company_id: user.companyId,
              reference_id: c.id,
              entry_date: { lt: fromDate },
            },
            select: { debit: true, credit: true },
          });
          const openingBalance = openingEntries.reduce(
            (sum, e) => sum + Number(e.debit) - Number(e.credit),
            0,
          );
          // قيود الفترة
          const entries = await prisma.journal_entries.findMany({
            where: {
              company_id: user.companyId,
              reference_id: c.id,
              entry_date: { gte: fromDate, lte: toDate },
            },
            orderBy: { entry_date: "asc" },
            select: {
              id: true,
              entry_date: true,
              debit: true,
              credit: true,
              description: true,
              entry_number: true,
              reference_type: true,
            },
          });

          // بناء كشف الحساب
          let runningBalance: number = 0;
          const transactions = entries.map((entry) => {
            runningBalance =
              runningBalance + Number(entry.debit) - Number(entry.credit);

            return {
              date: entry.entry_date?.toLocaleDateString("ar-EG"),
              debit: Number(entry.debit),
              credit: Number(entry.credit),
              balance: runningBalance.toFixed(2),
              description: entry.description,
              docNo: entry.entry_number,
              typeName: mapType(entry.reference_type),
            };
          });

          const totalDebit = transactions.reduce((s, t) => s + t.debit, 0);
          const totalCredit = transactions.reduce((s, t) => s + t.credit, 0);
          const closingBalance = Math.abs(totalDebit - totalCredit);
          const periodDebit = transactions.reduce((s, t) => s + t.debit, 0);
          const periodCredit = transactions.reduce((s, t) => s + t.credit, 0);

          // المنطق للعميل:
          // إذا كان الافتتاحي موجب (مدين) يضاف للمدين، وإذا كان سالب (دائن) يضاف للدائن
          const finalTotalDebit =
            openingBalance > 0 ? periodDebit + openingBalance : periodDebit;
          const finalTotalCredit =
            openingBalance < 0
              ? periodCredit + Math.abs(openingBalance)
              : periodCredit;
          customerStatements.push({
            customer: c,
            openingBalance: openingEntries.reduce(
              (sum, e) => sum + Number(e.debit) - Number(e.credit),
              0,
            ),
            closingBalance: closingBalance.toFixed(2),
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
          customers: customerStatements,
          period: { from: fromDisplay, to: toDisplay },
          ...baseData,
        };

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

        // 2️⃣ تجهيز كشف حساب لكل عميل
        const supplierStatements = [];

        for (const c of suppliers) {
          // رصيد افتتاحي
          const openingEntries = await prisma.journal_entries.findMany({
            where: {
              company_id: user.companyId,
              reference_id: c.id,
              entry_date: { lt: fromDate },
            },
            select: { debit: true, credit: true },
          });
          const openingBalance = openingEntries.reduce(
            (sum, e) => sum + Number(e.credit) - Number(e.debit),
            0,
          );
          // قيود الفترة
          const entries = await prisma.journal_entries.findMany({
            where: {
              company_id: user.companyId,
              reference_id: c.id,
              entry_date: { gte: fromDate, lte: toDate },
            },
            orderBy: { entry_date: "asc" },
            select: {
              id: true,
              entry_date: true,
              debit: true,
              credit: true,
              description: true,
              entry_number: true,
              reference_type: true,
            },
          });

          // بناء كشف الحساب
          let runningBalance: number = 0;
          const transactions = entries.map((entry) => {
            runningBalance =
              runningBalance + Number(entry.credit) - Number(entry.debit);

            return {
              date: entry.entry_date?.toLocaleDateString("ar-EG"),
              debit: Number(entry.debit),
              credit: Number(entry.credit),
              balance: runningBalance.toFixed(2),
              description: entry.description,
              docNo: entry.entry_number,
              typeName: mapType(entry.reference_type),
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
            companyId: user.companyId,
            type: "PAYMENT",
            createdAt: createDateFilter(fromDate, toDate),
            ...(customerId && { id: customerId }),
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
          const entries = await prisma.journal_entries.findMany({
            where: {
              company_id: user.companyId,
              account_id: bank.accountId,
              entry_date: { gte: fromDate, lte: toDate },
            },
            orderBy: { entry_date: "asc" },
            select: {
              id: true,
              entry_date: true,
              debit: true,
              credit: true,
              description: true,
              entry_number: true,
              reference_type: true,
            },
          });

          // بناء كشف الحساب
          let runningBalance: number = 0;
          const transactions = entries.map((entry) => {
            runningBalance =
              runningBalance + Number(entry.debit) - Number(entry.credit);

            return {
              date: entry.entry_date?.toLocaleDateString("ar-EG"),
              debit: Number(entry.debit),
              credit: Number(entry.credit),
              balance: runningBalance.toFixed(2),
              description: entry.description,
              docNo: entry.entry_number,
              typeName: mapType(entry.reference_type),
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
    await page.setContent(html, { waitUntil: "networkidle0" });
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
async function fetchReceiptsByCustomer(customerId: string, companyId: string) {
  const invoices = await prisma.invoice.findMany({
    where: {
      customerId,
      companyId,
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
      items: {
        include: {
          product: {
            include: {
              warehouse: {
                select: {
                  name: true,
                },
              },
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
      warehousename: item.product.warehouse?.name ?? "",

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

async function fetchReceiptsBySupplier(supplierId: string, companyId: string) {
  const invoices = await prisma.invoice.findMany({
    where: {
      supplierId,
      companyId,
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
      items: {
        include: {
          product: {
            include: {
              warehouse: {
                select: {
                  name: true,
                },
              },
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
      warehouse_name: item.product.warehouse?.name ?? "",
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
}: {
  accountId: string;
  companyId: string;
  fromDate: Date;
  toDate: Date;
}) {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `
    SELECT 
      je.id,
      je.entry_number,
      je.entry_date,
      je.description,
      je.debit,
      je.credit,
      je.reference_type,
      je.currency_code,
      a.account_name_en AS account_name,
      a.account_code AS account_code,
      a.currency_code AS account_currency
    FROM journal_entries je
    INNER JOIN accounts a ON je.account_id = a.id  -- الربط مع جدول الحسابات
    WHERE je.company_id = $1
      AND je.account_id = $2
      AND je.entry_date BETWEEN $3 AND $4
      AND je.is_posted = true
    ORDER BY je.entry_date ASC, je.created_at ASC
    `,
    companyId,
    accountId,
    fromDate,
    toDate,
  );

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
