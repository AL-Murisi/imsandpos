import prisma from "@/lib/prisma";
import fs from "fs";
import Handlebars from "handlebars";
import { NextRequest, NextResponse } from "next/server";
import { getBrowser } from "@/lib/puppeteerInstance";
import { getSession } from "@/lib/session";
import { getCompany } from "@/app/actions/createcompnayacc";

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

    // Destructure raw date strings from the client body (e.g., "2025-11-01")
    const { from: rawFrom, to: rawTo } = await req.json();

    // 1. ISO Dates for Prisma Queries (compatible with database WHERE clauses)
    const fromatDate = rawFrom ? new Date(rawFrom).toISOString() : undefined;
    const toDate = rawTo ? new Date(rawTo).toISOString() : undefined;

    // 2. Display Dates for Handlebars Template (formatted for 'ar-EG')
    const fromDisplayDate = rawFrom
      ? new Date(rawFrom).toLocaleDateString("ar-EG")
      : "";
    const toDisplayDate = rawTo
      ? new Date(rawTo).toLocaleDateString("ar-EG")
      : "";

    const user = await getSession();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const company = await getCompany(user.companyId);
    let data: any = {};
    let templatePath = "";

    switch (reportType) {
      case "sales":
        templatePath = "templates/sales-report.html";
        const sales = await prisma.saleItem.findMany({
          where: {
            companyId: user.companyId,
            createdAt: {
              ...(fromatDate && {
                gte: fromatDate,
              }),
              ...(toDate && {
                lte: toDate,
              }),
            },
          },
          include: {
            product: true,
            sale: true,
          },
        });

        data = {
          sales: sales.map((s) => ({
            product: s.product.name,
            quantity: s.quantity,
            total: s.totalPrice,
            sellingUnit: s.sellingUnit,
          })),
          company: company.data,
          totalSales: sales.reduce((sum, s) => sum + Number(s.totalPrice), 0),
          // Use the Display Dates for the template keys 'from' and 'to'
          from: fromDisplayDate,
          to: toDisplayDate,
          createby: user.name,
        };
        break;

      case "inventory":
        templatePath = "templates/inventory-report.html";
        const inventory = await prisma.inventory.findMany({
          where: {
            companyId: user.companyId,
            updatedAt: {
              ...(fromatDate && {
                gte: fromatDate,
              }),
              ...(toDate && {
                lte: toDate,
              }),
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

                supplier: { select: { id: true, name: true } }, // ✅ تأكد أن هذا موجود
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
          createby: user.name,
          // Use the Display Dates for the template keys 'from' and 'to'
          from: fromDisplayDate,
          to: toDisplayDate,
        };

        break;

      case "payments":
        templatePath = "templates/payments-report.html";

        const payments = await prisma.payment.findMany({
          where: {
            companyId: user.companyId,
            createdAt: {
              ...(fromatDate && {
                gte: fromatDate,
              }),
              ...(toDate && {
                lte: toDate,
              }),
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
          // FIXED: Use the Display Dates defined above
          from: fromDisplayDate,
          to: toDisplayDate,
          createby: user.name,
        };
        break;

      case "customers":
        templatePath = "templates/customers-report.html";
        const customers = await prisma.customer.findMany({
          where: {
            companyId: user.companyId,
            updatedAt: {
              ...(fromatDate && {
                gte: fromatDate,
              }),
              ...(toDate && {
                lte: toDate,
              }),
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
          // Use the Display Dates for the template keys 'from' and 'to'
          from: fromDisplayDate,
          to: toDisplayDate,
          createby: user.name,
          company: company.data,
        };
        break;

      case "profit-loss":
        templatePath = "templates/profit-loss-report.html";
        // Fetch revenue, cogs, expenses from accounts
        const revenueAccounts = await prisma.accounts.findMany({
          where: {
            company_id: user.companyId,
            account_type: "REVENUE",
            updated_at: {
              ...(fromatDate && {
                gte: fromatDate,
              }),
              ...(toDate && {
                lte: toDate,
              }),
            },
          },
        });
        const cogsAccounts = await prisma.accounts.findMany({
          where: {
            company_id: user.companyId,
            account_type: "EXPENSE",
            updated_at: {
              ...(fromatDate && {
                gte: fromatDate,
              }),
              ...(toDate && {
                lte: toDate,
              }),
            },
            account_category: "COST_OF_GOODS_SOLD",
          },
        });
        const expenseAccounts = await prisma.accounts.findMany({
          where: {
            company_id: user.companyId,
            account_type: "EXPENSE",
            updated_at: {
              ...(fromatDate && {
                gte: fromatDate,
              }),
              ...(toDate && {
                lte: toDate,
              }),
            },
            account_category: { not: "COST_OF_GOODS_SOLD" },
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

        const totalRevenue = revenue.reduce((sum, r) => sum + r.amount, 0);
        const totalCogs = cogs.reduce((sum, c) => sum + c.amount, 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const grossProfit = totalRevenue - totalCogs;
        const netProfit = grossProfit - totalExpenses;

        data = {
          companyName: "اسم الشركة",
          // Use the Display Dates for the template keys 'from' and 'to'
          from: fromDisplayDate,
          to: toDisplayDate,
          revenue,
          cogs,
          expenses,
          totalRevenue,
          totalCogs,
          grossProfit,
          totalExpenses,
          netProfit,
          company: company.data,
          createby: user.name,
        };
        break;

      default:
        return NextResponse.json(
          { error: "Invalid report type" },
          { status: 400 },
        );
    }

    // Compile template
    const htmlTemplate = fs.readFileSync(templatePath, "utf8");
    const template = Handlebars.compile(htmlTemplate);
    const html = template(data);

    // Generate PDF
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=${reportType}.pdf`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "PDF generation failed", err });
  }
}
