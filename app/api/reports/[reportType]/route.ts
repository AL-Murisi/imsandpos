import prisma from "@/lib/prisma";
import fs from "fs";
import path from "path";
import Handlebars from "handlebars";
import { NextRequest } from "next/server";
import { getBrowser } from "@/lib/puppeteerInstance";
import { getSession } from "@/lib/session";
import { getCompany } from "@/app/actions/createcompnayacc";

export const runtime = "nodejs"; // MUST for puppeteer + fs

// Correct interface in Next.js App Router
// Updated interface - params is now a Promise
interface RouteContext {
  params: Promise<{
    reportType: string;
  }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    // Await the params Promise
    const { reportType } = await context.params;

    // Parse body
    const { from: rawFrom, to: rawTo } = await req.json();

    // Query-compatible ISO dates
    const fromDate = rawFrom ? new Date(rawFrom).toISOString() : undefined;
    const toDate = rawTo ? new Date(rawTo).toISOString() : undefined;

    // Display dates for template
    const fromDisplayDate = rawFrom
      ? new Date(rawFrom).toLocaleDateString("ar-EG")
      : "";
    const toDisplayDate = rawTo
      ? new Date(rawTo).toLocaleDateString("ar-EG")
      : "";

    // Auth
    const user = await getSession();
    if (!user)
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });

    const company = await getCompany(user.companyId);

    let data: any = {};
    let templateFile = "";

    /* ===========================
        REPORT SWITCH
    ============================*/
    switch (reportType) {
      case "sales":
        templateFile = "sales-report.html";

        const sales = await prisma.saleItem.findMany({
          where: {
            companyId: user.companyId,
            createdAt: {
              ...(fromDate && { gte: fromDate }),
              ...(toDate && { lte: toDate }),
            },
          },
          include: { product: true, sale: true },
        });

        data = {
          sales: sales.map((s) => ({
            product: s.product.name,
            quantity: s.quantity,
            total: Number(s.totalPrice),
            sellingUnit: s.sellingUnit,
          })),
          company: company.data,
          totalSales: sales.reduce((sum, s) => sum + Number(s.totalPrice), 0),
          from: fromDisplayDate,
          to: toDisplayDate,
          createby: user.name,
        };
        break;

      case "inventory":
        templateFile = "inventory-report.html";

        const inventory = await prisma.inventory.findMany({
          where: {
            companyId: user.companyId,
            updatedAt: {
              ...(fromDate && { gte: fromDate }),
              ...(toDate && { lte: toDate }),
            },
          },
          select: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                costPrice: true,
                unitsPerPacket: true,
                type: true,
                packetsPerCarton: true,
                supplier: { select: { id: true, name: true } },
              },
            },
            warehouse: true,
            stockQuantity: true,
            availableQuantity: true,
            lastStockTake: true,
          },
        });

        data = {
          inventory: inventory.map((i) => ({
            product: i.product.name,
            stock: i.availableQuantity,
            supplier: i.product.supplier?.name,
            warehouse: i.warehouse.name,
            lastStockTake: i.lastStockTake?.toLocaleDateString("ar-EG"),
          })),
          company: company.data,
          date: new Date().toLocaleDateString("ar-EG"),
          totalInventoryValue: inventory.reduce(
            (sum, p) => sum + Number(p.product.costPrice),
            0,
          ),
          from: fromDisplayDate,
          to: toDisplayDate,
          createby: user.name,
        };
        break;

      case "payments":
        templateFile = "payments-report.html";

        const payments = await prisma.payment.findMany({
          where: {
            companyId: user.companyId,
            createdAt: {
              ...(fromDate && { gte: fromDate }),
              ...(toDate && { lte: toDate }),
            },
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
          payments: payments.map((p) => ({
            payee: p.payment_type,
            name: p.customer?.name ?? "",
            amount: p.amount,
            method: p.paymentMethod,
            date: p.createdAt.toLocaleDateString("ar-EG"),
          })),
          company: company.data,
          totalPayments: payments.reduce((sum, p) => sum + Number(p.amount), 0),
          from: fromDisplayDate,
          to: toDisplayDate,
          createby: user.name,
        };
        break;

      case "customers":
        templateFile = "customers-report.html";

        const customers = await prisma.customer.findMany({
          where: {
            companyId: user.companyId,
            updatedAt: {
              ...(fromDate && { gte: fromDate }),
              ...(toDate && { lte: toDate }),
            },
          },
        });

        data = {
          customers: customers.map((c) => ({
            name: c.name,
            phone: c.phoneNumber,
            balance: c.balance,
            outstanding: c.outstandingBalance,
          })),
          from: fromDisplayDate,
          to: toDisplayDate,
          createby: user.name,
          company: company.data,
        };
        break;

      case "profit-loss":
        templateFile = "profit-loss-report.html";

        const revenueAccounts = await prisma.accounts.findMany({
          where: {
            company_id: user.companyId,
            account_type: "REVENUE",
            updated_at: {
              ...(fromDate && { gte: fromDate }),
              ...(toDate && { lte: toDate }),
            },
          },
        });

        const cogsAccounts = await prisma.accounts.findMany({
          where: {
            company_id: user.companyId,
            account_type: "EXPENSE",
            account_category: "COST_OF_GOODS_SOLD",
            updated_at: {
              ...(fromDate && { gte: fromDate }),
              ...(toDate && { lte: toDate }),
            },
          },
        });

        const expenseAccounts = await prisma.accounts.findMany({
          where: {
            company_id: user.companyId,
            account_type: "EXPENSE",
            account_category: { not: "COST_OF_GOODS_SOLD" },
            updated_at: {
              ...(fromDate && { gte: fromDate }),
              ...(toDate && { lte: toDate }),
            },
          },
        });

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
          revenue,
          cogs,
          expenses,
          totalRevenue,
          totalCogs,
          grossProfit: totalRevenue - totalCogs,
          totalExpenses,
          netProfit: totalRevenue - totalCogs - totalExpenses,
          company: company.data,
          from: fromDisplayDate,
          to: toDisplayDate,
          createby: user.name,
        };
        break;

      default:
        return new Response(JSON.stringify({ error: "Invalid report type" }), {
          status: 400,
        });
    }

    /* ================================================
        ✅ FIXED — Safe template path (production works)
    ================================================ */
    const templatePath = path.join(process.cwd(), "templates", templateFile);

    const htmlTemplate = fs.readFileSync(templatePath, "utf8");
    const template = Handlebars.compile(htmlTemplate);
    const html = template(data);

    /* ================================================
        PDF GENERATION
    ================================================ */
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    /* ================================================
        ❗ MOST IMPORTANT:
        Return Uint8Array to prevent PDF corruption
    ================================================ */
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
