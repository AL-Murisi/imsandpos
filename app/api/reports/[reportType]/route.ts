// /app/api/reports/[reportType]/route.ts
import prisma from "@/lib/prisma";
import fs from "fs";
import Handlebars from "handlebars";
import { NextRequest, NextResponse } from "next/server";
import { getBrowser } from "@/lib/puppeteerInstance";
import { getSession } from "@/lib/session";

interface RouteContext {
  params: {
    reportType: string;
    // Add other dynamic route segments if you have any, e.g., 'id: string'
  };
}

export async function POST(
  req: NextRequest, // Use NextRequest for the first argument (Request object)
) {
  try {
    const { from, to, reportType } = await req.json();
    const user = await getSession();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let data: any = {};
    let templatePath = "";

    switch (reportType) {
      case "sales":
        templatePath = "templates/sales-report.html";
        const sales = await prisma.saleItem.findMany({
          where: {
            companyId: user.companyId,
            createdAt: { gte: from, lte: to },
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
          totalSales: sales.reduce((sum, s) => sum + Number(s.totalPrice), 0),
          from,
          to,
        };
        break;

      case "inventory":
        templatePath = "templates/inventory-report.html";
        const inventory = await prisma.inventory.findMany({
          where: { companyId: user.companyId },
        });
        data = {
          inventory: inventory.map((i) => ({
            product: i.productId,
            stock: i.availableQuantity,
            warehouse: i.warehouseId,
          })),
          date: new Date().toLocaleDateString("ar-EG"),
        };
        break;

      case "payments":
        templatePath = "templates/payments-report.html";
        const payments = await prisma.payment.findMany({
          where: {
            companyId: user.companyId,
            createdAt: { gte: new Date(from), lte: new Date(to) },
          },
        });
        data = {
          payments: payments.map((p) => ({
            name: p.createdAt,
            amount: p.amount,
            method: p.paymentMethod,
          })),
          totalPayments: payments.reduce((sum, p) => sum + Number(p.amount), 0),
          from,
          to,
        };
        break;

      case "customers":
        templatePath = "templates/customers-report.html";
        const customers = await prisma.customer.findMany({
          where: { companyId: user.companyId },
        });
        data = {
          customers: customers.map((c) => ({
            name: c.name,
            phone: c.phoneNumber,
            balance: c.balance,
            outstanding: c.outstandingBalance,
          })),
        };
        break;

      case "profit-loss":
        templatePath = "templates/profit-loss-report.html";
        // Fetch revenue, cogs, expenses from accounts
        const revenueAccounts = await prisma.accounts.findMany({
          where: { company_id: user.companyId, account_type: "REVENUE" },
        });
        const cogsAccounts = await prisma.accounts.findMany({
          where: {
            company_id: user.companyId,
            account_type: "EXPENSE",
            account_category: "COST_OF_GOODS_SOLD",
          },
        });
        const expenseAccounts = await prisma.accounts.findMany({
          where: {
            company_id: user.companyId,
            account_type: "EXPENSE",
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
          from,
          to,
          revenue,
          cogs,
          expenses,
          totalRevenue,
          totalCogs,
          grossProfit,
          totalExpenses,
          netProfit,
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
