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
    const { from: rawFrom, to: rawTo, customerId } = await req.json();

    const fromDate = rawFrom ? new Date(rawFrom).toISOString() : undefined;
    const toDate = rawTo ? new Date(rawTo).toISOString() : undefined;
    const fromDisplay = formatDate(rawFrom);
    const toDisplay = formatDate(rawTo);

    // Auth
    const user = await getSession();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const company = await getCompany(user.companyId);
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
        const sales = await prisma.saleItem.findMany({
          where: {
            companyId: user.companyId,
            createdAt: createDateFilter(fromDate, toDate),
          },
          include: { product: true, sale: true },
        });

        data = {
          ...baseData,
          sales: sales.map((s) => ({
            product: s.product.name,
            quantity: s.quantity,
            total: Number(s.totalPrice),
            sellingUnit: s.sellingUnit,
          })),
          totalSales: sales.reduce((sum, s) => sum + Number(s.totalPrice), 0),
        };
        break;
      }

      case "sales-by-product": {
        templateFile = "sales-by-product-report.html";
        const salesByProduct = await prisma.saleItem.groupBy({
          by: ["productId"],
          where: {
            companyId: user.companyId,
            createdAt: createDateFilter(fromDate, toDate),
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
        const salesByUser = await prisma.sale.groupBy({
          by: ["cashierId"],
          where: {
            companyId: user.companyId,
            createdAt: createDateFilter(fromDate, toDate),
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
        const sales = await prisma.sale.findMany({
          where: {
            companyId: user.companyId,
            createdAt: createDateFilter(fromDate, toDate),
          },
          select: {
            createdAt: true,
            totalAmount: true,
          },
        });

        const dailyMap = new Map<
          string,
          { date: string; total: number; count: number }
        >();

        sales.forEach((s) => {
          const date = s.createdAt.toLocaleDateString("ar-EG");
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
        const salesItems = await prisma.saleItem.findMany({
          where: {
            companyId: user.companyId,
            createdAt: createDateFilter(fromDate, toDate),
          },
          include: { product: true },
        });

        const profitByProduct = salesItems.reduce(
          (acc, item) => {
            const cost = Number(item.product.costPrice) * item.quantity;
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
        const purchases = await prisma.purchase.findMany({
          where: {
            companyId: user.companyId,
            createdAt: createDateFilter(fromDate, toDate),
          },
          include: {
            supplier: true,
            purchaseItems: { include: { product: true } },
          },
        });

        data = {
          ...baseData,
          purchases: purchases.flatMap((p) =>
            p.purchaseItems.map((item) => ({
              id: p.id,
              date: p.createdAt.toLocaleDateString("ar-EG"),
              supplier: p.supplier.name,
              product: item.product.name,
              quantity: item.quantity,
              unitPrice: Number(item.unitCost),
              total: Number(item.totalCost),
              status: p.status,
            })),
          ),
          totalPurchases: purchases.reduce((sum, p) => {
            const purchaseTotal = p.purchaseItems.reduce(
              (itemSum, item) => itemSum + Number(item.totalCost || 0),
              0,
            );
            return sum + purchaseTotal;
          }, 0),
        };
        break;
      }

      case "purchase-returns": {
        templateFile = "purchase-returns-report.html";
        const returns = await prisma.purchase.findMany({
          where: {
            companyId: user.companyId,
            createdAt: createDateFilter(fromDate, toDate),
            purchaseType: "return",
          },
          include: {
            purchaseItems: {
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
            r.purchaseItems.map((item) => ({
              id: r.id,
              date: r.createdAt.toLocaleDateString("ar-EG"),
              supplier: r.supplier.name,
              product: item.product.name,
              quantity: item.quantity,
              reason: item.product.stockMovements.find((p) => p.reason),
              total: Number(item.totalCost),
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
            _count: { select: { purchases: true } },
          },
        });
        console.log("suppliers", suppliers);
        data = {
          ...baseData,
          suppliers: suppliers.map((s) => ({
            name: s.name,
            phone: s.phoneNumber,
            email: s.email,
            purchaseCount: s._count.purchases,
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
        const payments = await prisma.payment.findMany({
          where: {
            companyId: user.companyId,
            createdAt: createDateFilter(fromDate, toDate),
          },
          select: {
            customer: true,
            createdAt: true,
            amount: true,
            payment_type: true,
            paymentMethod: true,
          },
        });

        data = {
          ...baseData,
          payments: payments.map((p) => ({
            payee: p.payment_type,
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

      case "tax": {
        templateFile = "tax-report.html";
        const sales = await prisma.sale.findMany({
          where: {
            companyId: user.companyId,
            createdAt: createDateFilter(fromDate, toDate),
          },
        });

        data = {
          ...baseData,
          sales: sales.map((s) => ({
            date: s.createdAt.toLocaleDateString("ar-EG"),
            total: Number(s.totalAmount),
            tax: Number(s.taxAmount || 0),
            netAmount: Number(s.totalAmount) - Number(s.taxAmount || 0),
          })),
          totalSales: sales.reduce((sum, s) => sum + Number(s.totalAmount), 0),
          totalTax: sales.reduce((sum, s) => sum + Number(s.taxAmount || 0), 0),
        };
        break;
      }

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

        // 1️⃣ جلب العملاء (عميل واحد أو الجميع)
        const customers = customerId
          ? await prisma.customer.findMany({
              where: { id: customerId, companyId: user.companyId },
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

          customerStatements.push({
            customer: c,

            closingBalance: closingBalance.toFixed(2),
            totalDebit: totalDebit.toFixed(2),
            totalCredit: totalCredit.toFixed(2),
            transactions,
            period: { from: fromDisplay, to: toDisplay },
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

      case "customer-payments": {
        templateFile = "customer-payments-report.html";
        const payments = await prisma.payment.findMany({
          where: {
            companyId: user.companyId,
            payment_type: "CUSTOMER_PAYMENT",
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

      default:
        return new Response(JSON.stringify({ error: "Invalid report type" }), {
          status: 400,
        });
    }
    console.log(data);
    /* ==================== PDF GENERATION ==================== */
    const templatePath = path.join(process.cwd(), "templates", templateFile);
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
  const results = await prisma.$queryRawUnsafe<any[]>(
    `
    WITH sale_data AS (
      SELECT 
        s.id AS sale_id,
        s.sale_number,
        s.subtotal,
        s.total_amount,
        s.amount_paid,
        s.discount_amount,
        s.sale_type,
        s.created_at,
        c.name AS customer_name,
        c.outstanding_balance,
        u.name AS cashier_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.cashier_id = u.id
      WHERE s.customer_id = $1
        AND s.company_id = $2
      ORDER BY s.created_at ASC
    )
    SELECT 
      s.*,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'name', p.name,
              'warehousename', w.name,
              'selectedQty', si.quantity,
              'sellingUnit', LOWER(si.selling_unit),
              'pricePerUnit', p.price_per_unit,
              'pricePerPacket', p.price_per_packet,
              'pricePerCarton', p.price_per_carton
            )
          )
          FROM sale_items si
          JOIN products p ON si.product_id = p.id
          LEFT JOIN warehouses w ON p.warehouse_id = w.id
          WHERE si.sale_id = s.sale_id
        ),
        '[]'::json
      ) AS items
    FROM sale_data s;
    `,
    customerId,
    companyId,
  );

  // Convert bigint safely
  return results.map((r) =>
    JSON.parse(
      JSON.stringify(r, (_k, v) => (typeof v === "bigint" ? Number(v) : v)),
    ),
  );
}

function prepareReceipt(receipt: any) {
  const createdAt = new Date(receipt.created_at);

  const items = (receipt.items ?? []).map((item: any, i: number) => {
    const unit = (item.sellingUnit ?? "unit").toLowerCase();

    const price =
      unit === "carton"
        ? Number(item.pricePerCarton || 0)
        : unit === "packet"
          ? Number(item.pricePerPacket || 0)
          : Number(item.pricePerUnit || 0);

    const qty = Number(item.selectedQty || 0);

    return {
      index: i + 1,
      name: item.name,
      warehousename: item.warehousename ?? "",
      selectedQty: qty,
      sellingUnitArabic: unitToArabic(unit),
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

const unitToArabic = (sellingUnit: "unit" | "packet" | "carton") => {
  switch (sellingUnit) {
    case "unit":
      return "حبة";
    case "packet":
      return "كيس";
    case "carton":
      return "كرتون";
    default:
      return "";
  }
};
