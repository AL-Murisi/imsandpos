// lib/debtSalesPdfExport.ts
import puppeteer from "puppeteer";
import puppeteerCore from "puppeteer-core";
interface DebtSale {
  id: string;
  saleDate: string | Date;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  paymentStatus: string;
  customer?: {
    name: string;
    phoneNumber?: string;
    customerType?: string;
  };
  createdAt?: string | Date;
}

interface DebtSalesData {
  sales: DebtSale[];
  summary: {
    totalDebt: number;
    totalSales: number;
    totalPaid: number;
    customerCount: number;
  };
  dateRange?: {
    from?: string;
    to?: string;
  };
}

export function generateDebtSalesHTML(data: DebtSalesData) {
  const { sales, summary, dateRange } = data;

  const createdAt = new Date().toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  });

  const transactionCount = Array.isArray(sales) ? sales.length : 0;
  const avgDebtPerSale =
    transactionCount > 0 ? summary.totalDebt / transactionCount : 0;
  const paymentRatio =
    summary.totalSales > 0 ? (summary.totalPaid / summary.totalSales) * 100 : 0;

  return `
<!DOCTYPE html>
<html >
<head>
  <meta charset="UTF-8" />
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', sans-serif;
      background-color: #fff;
      color: #111827;
      padding: 30px;
    }

    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #dc2626; padding-bottom: 20px; }
    .header h1 { font-size: 28px; font-weight: 700; color: #1f2937; margin-bottom: 8px; }
    .header .subtitle { color: #6b7280; font-size: 14px; }

    .cards { display: flex; gap: 15px; justify-content: center; flex-wrap: wrap; margin: 30px 0; }
    .card {
      border: 1px solid #e5e7eb;
      border-top: 4px solid;
      border-radius: 12px;
      width: 180px;
      height: 100px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      font-weight: 600;
      font-size: 18px;
      background: #fff;
    }
    .card.red { border-top-color: #ef4444; color: #dc2626; }
    .card.yellow { border-top-color: #f59e0b; color: #b45309; }
    .card.green { border-top-color: #10b981; color: #047857; }
    .card.blue { border-top-color: #3b82f6; color: #1e3a8a; }

    .summary {
      background: #f9fafb;
      padding: 20px;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      margin-top: 25px;
    }
    .summary-title { font-size: 18px; font-weight: 600; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
    .summary-stats { display: flex; justify-content: space-around; flex-wrap: wrap; gap: 10px; }
    .stat-box {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 15px;
      width: 200px;
      text-align: center;
      font-weight: 600;
      font-size: 16px;
    }

    .footer { text-align: center; font-size: 12px; color: #9ca3af; margin-top: 30px; }

    /* Table (optional but useful) */
    table { width: 100%; border-collapse: collapse; margin-top: 20px; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
    thead { background: #f3f4f6; }
    th, td { padding: 10px 12px; text-align: left; font-size: 12px; border-bottom: 1px solid #e5e7eb; }
    th { font-weight: 700; color: #374151; }
    tbody tr:nth-child(even) { background: #fafafa; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📋 تقرير المبيعات المدينة</h1>
    <p class="subtitle">تاريخ الإنشاء ${createdAt}</p>
  </div>

  <div class="cards">
    <div class="card red">
      <div>Total Debt</div>
      <div>${summary.totalDebt.toLocaleString("en-US")} SAR</div>
    </div>
    <div class="card yellow">
      <div>Total Sales</div>
      <div>${summary.totalSales.toLocaleString("en-US")} SAR</div>
    </div>
    <div class="card green">
      <div>Total Paid</div>
      <div>${summary.totalPaid.toLocaleString("en-US")} SAR</div>
    </div>
    <div class="card blue">
      <div>Customers</div>
      <div>${summary.customerCount}</div>
    </div>
  </div>

  <div class="summary">
    <div class="summary-title">📊 Additional Statistics</div>
    <div class="summary-stats">
      <div class="stat-box">
        <div>Transactions</div>
        <div>${transactionCount}</div>
      </div>
      <div class="stat-box">
        <div>Payment Ratio</div>
        <div>${paymentRatio.toFixed(1)}%</div>
      </div>
      <div class="stat-box">
        <div>Avg Debt per Sale</div>
        <div>${avgDebtPerSale.toLocaleString("en-US", { maximumFractionDigits: 2 })} SAR</div>
      </div>
    </div>
  </div>

  <!-- Optional: Sale details table -->
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Date</th>
        <th>Customer</th>
        <th>Total</th>
        <th>Paid</th>
        <th>Due</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${sales
        .map((sale, i) => {
          const date = new Date(sale.saleDate).toLocaleDateString("en-US");
          const customerName = sale.customer?.name ?? "Unknown";
          return `
          <tr>
            <td>${i + 1}</td>
            <td>${date}</td>
            <td>${customerName}</td>
            <td>${Number(sale.totalAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
            <td>${Number(sale.amountPaid).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
            <td>${Number(sale.amountDue).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
            <td>${sale.paymentStatus}</td>
          </tr>
        `;
        })
        .join("")}
    </tbody>
  </table>

  <div class="footer">
    Generated by Inventory Management System © ${new Date().getFullYear()}
  </div>
</body>
</html>
`;
}

import { getBrowser, closeBrowser } from "./puppeteerInstance";

export async function generateDebtSalesPDF(
  data: DebtSalesData,
): Promise<Buffer> {
  const html = generateDebtSalesHTML(data);
  const browser = await getBrowser();

  try {
    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: ["load", "networkidle0", "domcontentloaded"],
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "15mm",
        right: "10mm",
        bottom: "15mm",
        left: "10mm",
      },
      preferCSSPageSize: true,
    });

    await page.close();
    return Buffer.from(pdf);
  } finally {
    // Close browser only in production to prevent hanging
    if (process.env.NODE_ENV === "production") {
      await closeBrowser();
    }
  }
}
