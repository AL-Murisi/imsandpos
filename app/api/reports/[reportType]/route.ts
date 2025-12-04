// import prisma from "@/lib/prisma";
// import fs from "fs";
// import path from "path";
// import Handlebars from "handlebars";
// import { NextRequest } from "next/server";
// import { getBrowser } from "@/lib/puppeteerInstance";
// import { getSession } from "@/lib/session";
// import { getCompany } from "@/lib/actions/createcompnayacc";
// import { Prisma } from "@prisma/client";

// export const runtime = "nodejs"; // MUST for puppeteer + fs

// // Correct interface in Next.js App Router
// // Updated interface - params is now a Promise
// interface RouteContext {
//   params: Promise<{
//     reportType: string;
//   }>;
// }

// export async function POST(req: NextRequest, context: RouteContext) {
//   try {
//     // Await the params Promise
//     const { reportType } = await context.params;

//     // Parse body
//     const { from: rawFrom, to: rawTo } = await req.json();

//     // Query-compatible ISO dates
//     const fromDate = rawFrom ? new Date(rawFrom).toISOString() : undefined;
//     const toDate = rawTo ? new Date(rawTo).toISOString() : undefined;

//     // Display dates for template
//     const fromDisplayDate = rawFrom
//       ? new Date(rawFrom).toLocaleDateString("ar-EG")
//       : "";
//     const toDisplayDate = rawTo
//       ? new Date(rawTo).toLocaleDateString("ar-EG")
//       : "";

//     // Auth
//     const user = await getSession();
//     if (!user)
//       return new Response(JSON.stringify({ error: "Unauthorized" }), {
//         status: 401,
//       });

//     const company = await getCompany(user.companyId);

//     let data: any = {};
//     let templateFile = "";

//     /* ===========================
//         REPORT SWITCH
//     ============================*/
//     switch (reportType) {
//       case "sales":
//         templateFile = "sales-report.html";

//         const sales = await prisma.saleItem.findMany({
//           where: {
//             companyId: user.companyId,
//             createdAt: {
//               ...(fromDate && { gte: fromDate }),
//               ...(toDate && { lte: toDate }),
//             },
//           },
//           include: { product: true, sale: true },
//         });

//         data = {
//           sales: sales.map((s) => ({
//             product: s.product.name,
//             quantity: s.quantity,
//             total: Number(s.totalPrice),
//             sellingUnit: s.sellingUnit,
//           })),
//           company: company.data,
//           totalSales: sales.reduce((sum, s) => sum + Number(s.totalPrice), 0),
//           from: fromDisplayDate,
//           to: toDisplayDate,
//           createby: user.name,
//         };
//         break;

//       case "inventory":
//         templateFile = "inventory-report.html";

//         const inventory = await prisma.inventory.findMany({
//           where: {
//             companyId: user.companyId,
//             updatedAt: {
//               ...(fromDate && { gte: fromDate }),
//               ...(toDate && { lte: toDate }),
//             },
//           },
//           select: {
//             product: {
//               select: {
//                 id: true,
//                 name: true,
//                 sku: true,
//                 costPrice: true,
//                 unitsPerPacket: true,
//                 type: true,
//                 packetsPerCarton: true,
//                 supplier: { select: { id: true, name: true } },
//               },
//             },
//             warehouse: true,
//             stockQuantity: true,
//             availableQuantity: true,
//             lastStockTake: true,
//           },
//         });

//         data = {
//           inventory: inventory.map((i) => ({
//             product: i.product.name,
//             stock: i.availableQuantity,
//             supplier: i.product.supplier?.name,
//             warehouse: i.warehouse.name,
//             lastStockTake: i.lastStockTake?.toLocaleDateString("ar-EG"),
//           })),
//           company: company.data,
//           date: new Date().toLocaleDateString("ar-EG"),
//           totalInventoryValue: inventory.reduce(
//             (sum, p) => sum + Number(p.product.costPrice),
//             0,
//           ),
//           from: fromDisplayDate,
//           to: toDisplayDate,
//           createby: user.name,
//         };
//         break;

//       case "payments":
//         templateFile = "payments-report.html";

//         const payments = await prisma.payment.findMany({
//           where: {
//             companyId: user.companyId,
//             createdAt: {
//               ...(fromDate && { gte: fromDate }),
//               ...(toDate && { lte: toDate }),
//             },
//           },
//           select: {
//             customer: true,
//             createdAt: true,
//             amount: true,
//             payment_type: true,
//             paymentMethod: true,
//           },
//         });

//         data = {
//           payments: payments.map((p) => ({
//             payee: p.payment_type,
//             name: p.customer?.name ?? "",
//             amount: p.amount,
//             method: p.paymentMethod,
//             date: p.createdAt.toLocaleDateString("ar-EG"),
//           })),
//           company: company.data,
//           totalPayments: payments.reduce((sum, p) => sum + Number(p.amount), 0),
//           from: fromDisplayDate,
//           to: toDisplayDate,
//           createby: user.name,
//         };
//         break;

//       case "customers":
//         templateFile = "customers-report.html";

//         const customers = await prisma.customer.findMany({
//           where: {
//             companyId: user.companyId,
//             updatedAt: {
//               ...(fromDate && { gte: fromDate }),
//               ...(toDate && { lte: toDate }),
//             },
//           },
//         });

//         data = {
//           customers: customers.map((c) => ({
//             name: c.name,
//             phone: c.phoneNumber,
//             balance: c.balance,
//             outstanding: c.outstandingBalance,
//           })),
//           from: fromDisplayDate,
//           to: toDisplayDate,
//           createby: user.name,
//           company: company.data,
//         };
//         break;

//       case "profit-loss":
//         templateFile = "profit-loss-report.html";

//         const revenueAccounts = await prisma.accounts.findMany({
//           where: {
//             company_id: user.companyId,
//             account_type: "REVENUE",
//             updated_at: {
//               ...(fromDate && { gte: fromDate }),
//               ...(toDate && { lte: toDate }),
//             },
//           },
//         });

//         const cogsAccounts = await prisma.accounts.findMany({
//           where: {
//             company_id: user.companyId,
//             account_type: "EXPENSE",
//             account_category: "COST_OF_GOODS_SOLD",
//             updated_at: {
//               ...(fromDate && { gte: fromDate }),
//               ...(toDate && { lte: toDate }),
//             },
//           },
//         });

//         const expenseAccounts = await prisma.accounts.findMany({
//           where: {
//             company_id: user.companyId,
//             account_type: "EXPENSE",
//             account_category: { not: "COST_OF_GOODS_SOLD" },
//             updated_at: {
//               ...(fromDate && { gte: fromDate }),
//               ...(toDate && { lte: toDate }),
//             },
//           },
//         });

//         const revenue = revenueAccounts.map((r) => ({
//           name: r.account_name_en,
//           amount: Number(r.balance),
//         }));

//         const cogs = cogsAccounts.map((c) => ({
//           name: c.account_name_en,
//           amount: Number(c.balance),
//         }));

//         const expenses = expenseAccounts.map((e) => ({
//           name: e.account_name_en,
//           amount: Number(e.balance),
//         }));

//         const totalRevenue = revenue.reduce((s, r) => s + r.amount, 0);
//         const totalCogs = cogs.reduce((s, c) => s + c.amount, 0);
//         const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

//         data = {
//           revenue,
//           cogs,
//           expenses,
//           totalRevenue,
//           totalCogs,
//           grossProfit: totalRevenue - totalCogs,
//           totalExpenses,
//           netProfit: totalRevenue - totalCogs - totalExpenses,
//           company: company.data,
//           from: fromDisplayDate,
//           to: toDisplayDate,
//           createby: user.name,
//         };
//         break;
//       case "low-stock":
//         const rawQuery = Prisma.sql`
//           SELECT
//             i.id AS inventoryId,
//             i."stock_quantity",
//             i."reorder_level",
//             p.id AS product_id,
//             p.name AS productName,
//             w.name AS warehouseName
//           FROM
//             "inventory" i
//           JOIN
//             "products" p ON i."product_id" = p.id
//           JOIN
//             "warehouses" w ON i."warehouse_id" = w.id
//           WHERE
//             i."company_id" = ${user.companyId}
//             AND (
//               i."stock_quantity" <= i."reorder_level"
//               OR i."stock_quantity" = 0
//             );
//         `;

//         type LowStockResult = {
//           inventoryId: string;
//           stockQuantity: number;
//           reorderLevel: number;
//           productId: string;
//           productName: string;
//           warehouseName: string;
//         };

//         const lowStockRecords: LowStockResult[] =
//           await prisma.$queryRaw<LowStockResult[]>(rawQuery);
//         Handlebars.registerHelper("eq", (a, b) => a === b);
//         Handlebars.registerHelper("lt", (a, b) => a < b);
//         console.log(lowStockRecords);
//         templateFile = "out-of-stock-report.html"; // Assume you have a template
//         data = {
//           lowStockRecords,
//           company: company.data,
//           date: new Date().toLocaleDateString("ar-EG"),
//           createby: user.name,
//         };
//         break;

//       // ✅ NEW CASE: EXPIRING PRODUCTS

//       case "expiring-products":
//         const today = new Date();

//         const threeDaysFromNow = new Date();
//         threeDaysFromNow.setDate(today.getDate() + 3);

//         const thirtyDaysFromNow = new Date();
//         thirtyDaysFromNow.setDate(today.getDate() + 30);

//         // Set a very distant past date to catch all expired items
//         const longTimeAgo = new Date();
//         longTimeAgo.setFullYear(today.getFullYear() - 10); // 10 years ago
//         templateFile = "expiring-products-report.html";

//         // 1. Fetch products where expiredAt falls within the next 30 days, OR is already expired.
//         const expiringProducts = await prisma.product.findMany({
//           where: {
//             companyId: user.companyId,
//             // Check for any product that has expired or will expire within 30 days
//             expiredAt: {
//               // Less than or equal to 30 days from now (covers expired, 3-day, and 30-day windows)
//               lte: thirtyDaysFromNow,
//               // Greater than or equal to a distant past date (catches all historical expirations)
//               gte: longTimeAgo,
//             },
//           },
//           select: {
//             id: true,
//             name: true,
//             sku: true,
//             expiredAt: true,
//             inventory: {
//               select: {
//                 stockQuantity: true,
//                 warehouse: { select: { name: true } },
//               },
//             },
//           },
//           orderBy: {
//             expiredAt: "asc", // Show soonest/already expired items first
//           },
//         });

//         // 2. Map and categorize the data for the report
//         data = {
//           expiringProducts: expiringProducts.map((p) => {
//             const expiryDate = p.expiredAt;
//             const daysDifference = Math.ceil(
//               (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
//             );

//             let status:
//               | "Expired"
//               | "Expiring Soon (3 Days)"
//               | "Expiring (30 Days)"
//               | "Unknown";

//             if (daysDifference < 0) {
//               status = "Expired"; // Date is in the past
//             } else if (daysDifference <= 3) {
//               status = "Expiring Soon (3 Days)";
//             } else if (daysDifference <= 30) {
//               status = "Expiring (30 Days)";
//             } else {
//               status = "Unknown";
//             }

//             return {
//               name: p.name,
//               sku: p.sku,
//               expiryDate: expiryDate.toLocaleDateString("ar-EG"),
//               stock: p.inventory[0]?.stockQuantity ?? 0,
//               warehouse: p.inventory[0]?.warehouse?.name ?? "N/A",
//               daysUntilExpiry: daysDifference,
//               status: status, // New field to categorize expiration severity
//             };
//           }),
//           company: company.data,
//           date: new Date().toLocaleDateString("ar-EG"),
//           createby: user.name,
//         };
//         break;
//       default:
//         return new Response(JSON.stringify({ error: "Invalid report type" }), {
//           status: 400,
//         });
//     }

//     /* ================================================
//         ✅ FIXED — Safe template path (production works)
//     ================================================ */
//     const templatePath = path.join(process.cwd(), "templates", templateFile);

//     const htmlTemplate = fs.readFileSync(templatePath, "utf8");

//     // ⭐ Fix: Register missing helpers
//     Handlebars.registerHelper("eq", (a, b) => a === b);

//     const template = Handlebars.compile(htmlTemplate);
//     const html = template(data);

//     /* ================================================
//         PDF GENERATION
//     ================================================ */
//     const browser = await getBrowser();
//     const page = await browser.newPage();
//     await page.setContent(html, { waitUntil: "networkidle0" });

//     const pdfBuffer = await page.pdf({
//       format: "A4",
//       printBackground: true,
//     });

//     /* ================================================
//         ❗ MOST IMPORTANT:
//         Return Uint8Array to prevent PDF corruption
//     ================================================ */
//     return new Response(new Uint8Array(pdfBuffer), {
//       status: 200,
//       headers: {
//         "Content-Type": "application/pdf",
//         "Content-Disposition": `attachment; filename="${reportType}.pdf"`,
//       },
//     });
//   } catch (err: any) {
//     console.error("PDF Error:", err);
//     return new Response(
//       JSON.stringify({ error: "PDF generation failed", details: err.message }),
//       { status: 500 },
//     );
//   }
// }

import prisma from "@/lib/prisma";
import fs from "fs";
import path from "path";
import Handlebars from "handlebars";
import { NextRequest } from "next/server";
import { getBrowser } from "@/lib/puppeteerInstance";
import { getSession } from "@/lib/session";
import { getCompany } from "@/lib/actions/createcompnayacc";
import { Prisma } from "@prisma/client";

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
              product: product?.name,
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
        templateFile = "out-of-stock-report.html";
        const rawQuery = Prisma.sql`
          SELECT i.id AS "inventoryId",
                 i."stock_quantity" AS "stockQuantity",
                 i."reorder_level" AS "reorderLevel",
                 p.id AS "productId",
                 p.name AS "productName",
                 w.name AS "warehouseName"
          FROM "inventory" i
          JOIN "products" p ON i."product_id" = p.id
          JOIN "warehouses" w ON i."warehouse_id" = w.id
          WHERE i."company_id" = ${user.companyId}
          AND (i."stock_quantity" <= i."reorder_level" OR i."stock_quantity" = 0)
        `;

        const lowStockRecords = await prisma.$queryRaw<any[]>(rawQuery);

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

        data = {
          ...baseData,
          stockTake: stockTake.map((s) => ({
            product: s.product.name,
            warehouse: s.warehouse.name,
            expectedStock: s.stockQuantity,
            actualStock: s.availableQuantity,
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
              date: p.createdAt.toLocaleDateString("ar-EG"),
              supplier: p.supplier.name,
              product: item.product.name,
              quantity: item.quantity,
              unitPrice: Number(item.unitCost),
              total: Number(item.totalCost),
            })),
          ),
          totalPurchases: purchases.reduce(
            (sum, p) => sum + Number(p.purchaseItems[0].totalCost),
            0,
          ),
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
            purchaseItems: { include: { product: true } },
            supplier: true,
          },
        });

        data = {
          ...baseData,
          returns: returns.flatMap((r) =>
            r.purchaseItems.map((item) => ({
              date: r.createdAt.toLocaleDateString("ar-EG"),
              supplier: r.supplier.name,
              product: item.product.name,
              quantity: item.quantity,

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

      case "customer-payments": {
        templateFile = "customer-payments-report.html";
        const payments = await prisma.payment.findMany({
          where: {
            companyId: user.companyId,
            payment_type: "CUSTOMER_PAYMENT",
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

      default:
        return new Response(JSON.stringify({ error: "Invalid report type" }), {
          status: 400,
        });
    }

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
