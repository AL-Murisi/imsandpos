import puppeteer from "puppeteer";
import { getBrowser, closeBrowser } from "./puppeteerInstance";

interface Customer {
  name: string;
  phoneNumber?: string;
  customerType?: string;
}

interface Sale {
  id: string;
  saleDate: string | Date;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  paymentStatus: string;
  customer?: Customer;
  createdAt?: string | Date;
}

interface DebtSalesData {
  sales: Sale[];
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

function buildDebtSalesData(sales: Sale[]): DebtSalesData {
  const summary = {
    totalDebt: sales.reduce((sum, s) => sum + Number(s.amountDue || 0), 0),
    totalSales: sales.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0),
    totalPaid: sales.reduce((sum, s) => sum + Number(s.amountPaid || 0), 0),
    customerCount: new Set(sales.map((s) => s.customer?.name || s?.customer))
      .size,
  };

  return { sales, summary };
}

function generateDebtSalesHTML(data: DebtSalesData): string {
  const { sales, summary, dateRange } = data;

  // Calculate statistics
  const avgDebtPerSale =
    sales.length > 0 ? summary.totalDebt / sales.length : 0;
  const paymentRate =
    summary.totalSales > 0 ? (summary.totalPaid / summary.totalSales) * 100 : 0;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          padding: 30px;
          background: white;
          color: #1f2937;
          direction: rtl;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #dc2626;
          padding-bottom: 20px;
        }
        .header h1 {
          color: #1f2937;
          font-size: 28px;
          margin-bottom: 8px;
        }
        .header .subtitle {
          color: #6b7280;
          font-size: 13px;
          margin-top: 5px;
        }
        .date-range {
          background: #fef2f2;
          border: 1px solid #fecaca;
          padding: 10px 15px;
          border-radius: 8px;
          text-align: center;
          margin-bottom: 20px;
          font-size: 13px;
          color: #991b1b;
        }
        
        /* Summary Cards */
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          margin-bottom: 30px;
        }
        .summary-card {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          padding: 18px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .summary-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #dc2626, #ef4444);
        }
        .summary-card.danger::before { background: linear-gradient(90deg, #dc2626, #ef4444); }
        .summary-card.warning::before { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
        .summary-card.success::before { background: linear-gradient(90deg, #10b981, #34d399); }
        .summary-card.info::before { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
        
        .summary-card .label {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 8px;
          font-weight: 500;
        }
        .summary-card .value {
          font-size: 22px;
          font-weight: bold;
          color: #1f2937;
        }
        .summary-card .value.danger { color: #dc2626; }
        .summary-card .value.success { color: #10b981; }
        
        /* Statistics Section */
        .stats-section {
          margin-bottom: 30px;
          background: #f9fafb;
          padding: 20px;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
        }
        .stats-title {
          font-size: 16px;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 15px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
        }
        .stat-item {
          background: white;
          padding: 12px;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
        }
        .stat-item .stat-label {
          font-size: 11px;
          color: #6b7280;
          margin-bottom: 4px;
        }
        .stat-item .stat-value {
          font-size: 18px;
          font-weight: 700;
          color: #1f2937;
        }
        
        /* Table Styles */
        .table-container {
          margin-bottom: 30px;
          background: white;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .table-title {
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
          color: white;
          padding: 15px 20px;
          font-size: 16px;
          font-weight: 700;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        thead {
          background: #fef2f2;
          border-bottom: 2px solid #fecaca;
        }
        th {
          color: #991b1b;
          padding: 12px 15px;
          text-align: right;
          font-weight: 700;
          font-size: 12px;
        }
        td {
          padding: 10px 15px;
          border-bottom: 1px solid #e5e7eb;
          font-size: 12px;
        }
        tr:last-child td {
          border-bottom: none;
        }
        tbody tr:nth-child(even) {
          background: #f9fafb;
        }
        tbody tr:hover {
          background: #fef2f2;
        }
        
        /* Status Badges */
        .status-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
        }
        .status-badge.partial {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fcd34d;
        }
        .status-badge.pending {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }
        .status-badge.completed {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }
        
        /* Amount Styling */
        .amount {
          font-weight: 600;
          font-family: 'Courier New', monospace;
        }
        .amount.debt {
          color: #dc2626;
        }
        .amount.paid {
          color: #059669;
        }
        .amount.total {
          color: #1f2937;
        }
        
        /* Customer Info */
        .customer-info {
          line-height: 1.4;
        }
        .customer-name {
          font-weight: 600;
          color: #1f2937;
        }
        .customer-phone {
          font-size: 11px;
          color: #6b7280;
        }
        .customer-type {
          display: inline-block;
          font-size: 10px;
          padding: 2px 6px;
          background: #e0e7ff;
          color: #3730a3;
          border-radius: 4px;
          margin-top: 2px;
        }
        
        /* Footer Summary */
        .footer-summary {
          margin-top: 30px;
          padding: 20px;
          background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
          color: white;
          border-radius: 10px;
        }
        .footer-summary .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .footer-summary .summary-row:last-child {
          border-bottom: none;
          padding-top: 12px;
          margin-top: 8px;
          border-top: 2px solid rgba(255,255,255,0.2);
        }
        .footer-summary .summary-row.total {
          font-size: 18px;
          font-weight: 700;
        }
        
        /* Footer */
        .footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 2px solid #e5e7eb;
          text-align: center;
          color: #9ca3af;
          font-size: 11px;
        }
        
        /* Page breaks */
        .page-break {
          page-break-after: always;
        }
        
        @media print {
          body { padding: 15px; }
          .table-container { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        <h1>📋 تقرير المبيعات المديونة</h1>
        <p class="subtitle">تم إنشاؤه في ${new Date().toLocaleString("ar-SA", {
          dateStyle: "full",
          timeStyle: "short",
        })}</p>
      </div>

      <!-- Date Range -->
      ${
        dateRange?.from || dateRange?.to
          ? `
      <div class="date-range">
        <strong>الفترة الزمنية:</strong>
        ${dateRange.from ? `من ${new Date(dateRange.from).toLocaleDateString("ar-SA")}` : ""}
        ${dateRange.to ? `إلى ${new Date(dateRange.to).toLocaleDateString("ar-SA")}` : ""}
      </div>
      `
          : ""
      }

      <!-- Summary Cards -->
      <div class="summary-grid">
        <div class="summary-card danger">
          <div class="label">إجمالي الديون</div>
          <div class="value danger">${summary.totalDebt.toLocaleString("ar-SA")} ر.س</div>
        </div>
        <div class="summary-card warning">
          <div class="label">إجمالي المبيعات</div>
          <div class="value">${summary.totalSales.toLocaleString("ar-SA")} ر.س</div>
        </div>
        <div class="summary-card success">
          <div class="label">إجمالي المدفوع</div>
          <div class="value success">${summary.totalPaid.toLocaleString("ar-SA")} ر.س</div>
        </div>
        <div class="summary-card info">
          <div class="label">عدد العملاء</div>
          <div class="value">${summary.customerCount}</div>
        </div>
      </div>

      <!-- Statistics -->
      <div class="stats-section">
        <div class="stats-title">📊 إحصائيات إضافية</div>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-label">متوسط الدين لكل عملية</div>
            <div class="stat-value">${avgDebtPerSale.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} ر.س</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">نسبة الدفع</div>
            <div class="stat-value">${paymentRate.toFixed(1)}%</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">عدد المعاملات</div>
            <div class="stat-value">${sales.length}</div>
          </div>
        </div>
      </div>

      <!-- Sales Table -->
      <div class="table-container">
        <div class="table-title">تفاصيل المبيعات المديونة</div>
        <table>
          <thead>
            <tr>  <th>#</th>
              <th>التاريخ</th>
              <th>العميل</th>
              <th>المبلغ الإجمالي</th>
              <th>المدفوع</th>
              <th>المتبقي</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            ${sales
              .map(
                (sale, index) => `
              <tr>
              <td>${index + 1}</td>
                <td>${new Date(sale.saleDate).toLocaleDateString("ar-SA")}</td>
                <td>
                  <div class="customer-info">
                    <div class="customer-name">${sale.customer?.name || "عميل غير مسجل"}</div>
                    ${
                      sale.customer?.phoneNumber
                        ? `
                      <div class="customer-phone">${sale.customer.phoneNumber}</div>
                    `
                        : ""
                    }
                    ${
                      sale.customer?.customerType
                        ? `
                      <span class="customer-type">${sale.customer.customerType}</span>
                    `
                        : ""
                    }
                  </div>
                </td>
                <td><span class="amount total">${sale.totalAmount.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</span></td>
                <td><span class="amount paid">${sale.amountPaid.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</span></td>
                <td><span class="amount debt">${sale.amountDue.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</span></td>
                <td>
                  <span class="status-badge ${sale.paymentStatus}">
                    ${
                      sale.paymentStatus === "partial"
                        ? "دفع جزئي"
                        : sale.paymentStatus === "pending"
                          ? "قيد الانتظار"
                          : sale.paymentStatus === "completed"
                            ? "مكتمل"
                            : sale.paymentStatus
                    }
                  </span>
                </td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>

      <!-- Footer Summary -->
      <div class="footer-summary">
        <div class="summary-row">
          <span>إجمالي المبيعات:</span>
          <span>${summary.totalSales.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</span>
        </div>
        <div class="summary-row">
          <span>إجمالي المدفوع:</span>
          <span style="color: #10b981">${summary.totalPaid.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</span>
        </div>
        <div class="summary-row total">
          <span>إجمالي الديون المستحقة:</span>
          <span style="color: #fca5a5">${summary.totalDebt.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</span>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>هذا تقرير آلي تم إنشاؤه من نظام إدارة المخزون</p>
        <p>© ${new Date().getFullYear()} جميع الحقوق محفوظة</p>
      </div>
    </body>
    </html>
  `;
}

export async function generateDebtSalesPDF(sales: Sale[]): Promise<Buffer> {
  const data = buildDebtSalesData(sales);
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
      margin: { top: "15mm", right: "10mm", bottom: "15mm", left: "10mm" },
      preferCSSPageSize: true,
    });

    await page.close();
    return Buffer.from(pdf);
  } finally {
    if (process.env.NODE_ENV === "production") await closeBrowser();
  }
}
