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

  const createdAt = new Date().toLocaleString("ar-EG", {
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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap" rel="stylesheet">
  <style>

    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Cairo', sans-serif;
      background-color: #fff;
      color: #111827;
      padding: 30px;
      direction: rtl;
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
    .summary-title { font-size: 18px; font-weight: 700; margin-bottom: 10px; }
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

    table { width: 100%; border-collapse: collapse; margin-top: 20px; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
    thead { background: #f3f4f6; }
    th, td { padding: 10px 12px; text-align: center; font-size: 12px; border-bottom: 1px solid #e5e7eb; }
    th { font-weight: 700; color: #374151; }
    tbody tr:nth-child(even) { background: #fafafa; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📋 تقرير المبيعات المدينة</h1>
    <p class="subtitle">تاريخ الإنشاء: ${createdAt}</p>
  </div>

  <div class="cards">
    <div class="card red">
      <div>إجمالي الدين</div>
      <div>${summary.totalDebt.toLocaleString("us-EG")} ر.س</div>
    </div>
    <div class="card yellow">
      <div>إجمالي المبيعات</div>
      <div>${summary.totalSales.toLocaleString("us-EG")} ر.س</div>
    </div>
    <div class="card green">
      <div>المبالغ المدفوعة</div>
      <div>${summary.totalPaid.toLocaleString("us-EG")} ر.س</div>
    </div>
    <div class="card blue">
      <div>عدد العملاء</div>
      <div>${summary.customerCount}</div>
    </div>
  </div>

  <div class="summary">
    <div class="summary-title">📊 إحصائيات إضافية</div>
    <div class="summary-stats">
      <div class="stat-box">
        <div>عدد العمليات</div>
        <div>${transactionCount}</div>
      </div>
      <div class="stat-box">
        <div>نسبة المدفوعات</div>
        <div>${paymentRatio.toFixed(1)}%</div>
      </div>
      <div class="stat-box">
        <div>متوسط الدين لكل عملية</div>
        <div>${avgDebtPerSale.toLocaleString("ar-EG", { maximumFractionDigits: 2 })} ر.س</div>
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>التاريخ</th>
        <th>العميل</th>
        <th>الإجمالي</th>
        <th>المدفوع</th>
        <th>المتبقي</th>
        <th>الحالة</th>
      </tr>
    </thead>
    <tbody>
      ${sales
        .map((sale, i) => {
          const date = new Date(sale.saleDate).toLocaleDateString("ar-EG");
          const customerName = sale.customer?.name ?? "غير معروف";
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
    تم الإنشاء بواسطة نظام إدارة المخزون © ${new Date().getFullYear()}
  </div>
</body>
</html>
  `;
}

import { getBrowser, closeBrowser } from "./puppeteerInstance";
import { time } from "console";
export async function generateDebtSalesPDF(
  data: DebtSalesData,
): Promise<Buffer> {
  const html = generateDebtSalesHTML(data);
  const browser = await getBrowser();

  try {
    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: ["load", "networkidle0"],
      timeout: 60000,
    });

    // Wait for fonts to load
    await page.evaluateHandle("document.fonts.ready");

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
    if (process.env.NODE_ENV === "production") {
      await closeBrowser();
    }
  }
}
