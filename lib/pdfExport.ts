import puppeteer from "puppeteer";

interface DashboardData {
  sales: { total: number; chart: Array<{ date: string; value: number }> };
  purchases: { total: number; chart: Array<{ date: string; value: number }> };
  revenue: { total: number; chart: Array<{ date: string; value: number }> };
  debt: {
    unreceived: number;
    received: number;
    unreceivedChart: Array<{ date: string; value: number }>;
    receivedChart: Array<{ date: string; value: number }>;
  };
  productStats: {
    totalStockQuantity: number;
    lowStockProducts: number;
    zeroProducts: number;
  };
  users: { users: number };
  topProducts: Array<{ name: string; quantity: number }>;
  recentSales: Array<any>;
  activityLogs?: Array<any>;
}

function generateHTMLReport(data: DashboardData): string {
  const maxSalesValue = Math.max(...data.sales.chart.map((d) => d.value), 1);
  const maxRevenueValue = Math.max(
    ...data.revenue.chart.map((d) => d.value),
    1,
  );

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
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #3b82f6;
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
        }
        
        /* Metrics Grid */
        .metrics {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          margin-bottom: 30px;
        }
        .metric-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 10px;
          padding: 18px;
          text-align: center;
          color: white;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .metric-card.blue { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .metric-card.green { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
        .metric-card.purple { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); }
        .metric-card.orange { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
        
        .metric-card .label {
          font-size: 12px;
          opacity: 0.9;
          margin-bottom: 6px;
          font-weight: 500;
        }
        .metric-card .value {
          font-size: 22px;
          font-weight: bold;
        }
        
        /* Section Styles */
        .section {
          margin-bottom: 30px;
          page-break-inside: avoid;
          background: white;
          border-radius: 8px;
        }
        .section-title {
          color: #1f2937;
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e5e7eb;
        }
        
        /* Chart Styles */
        .chart-container {
          margin: 15px 0;
          padding: 20px;
          background: #f9fafb;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }
        .chart-title {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 15px;
        }
        .bar-chart {
          display: flex;
          align-items: flex-end;
          height: 180px;
          gap: 3px;
          padding: 10px 0;
          position: relative;
        }
        .bar-chart::before {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: #d1d5db;
        }
        .bar {
          flex: 1;
          background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
          border-radius: 4px 4px 0 0;
          position: relative;
          min-height: 3px;
          box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
        }
        .bar.green {
          background: linear-gradient(180deg, #10b981 0%, #059669 100%);
          box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
        }
        .bar-label {
          position: absolute;
          bottom: -20px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 9px;
          color: #6b7280;
          white-space: nowrap;
        }
        .bar-value {
          position: absolute;
          top: -18px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 10px;
          font-weight: 600;
          color: #1f2937;
          white-space: nowrap;
        }
        
        /* Table Styles */
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        thead {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        }
        th {
          color: white;
          padding: 12px 15px;
          text-align: left;
          font-weight: 600;
          font-size: 13px;
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
          background: #f3f4f6;
        }
        
        /* Status Badge */
        .status {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
        }
        .status.completed { background: #d1fae5; color: #065f46; }
        .status.pending { background: #fef3c7; color: #92400e; }
        .status.partial { background: #dbeafe; color: #1e40af; }
        
        /* Grid for charts */
        .charts-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-bottom: 30px;
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
        
        @media print {
          body { padding: 15px; }
          .section { page-break-inside: avoid; }
          .chart-container { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        <h1>📊 Dashboard Report</h1>
        <p class="subtitle">Generated on ${new Date().toLocaleString("en-US", {
          dateStyle: "full",
          timeStyle: "short",
        })}</p>
      </div>

      <!-- Key Metrics -->
      <div class="metrics">
        <div class="metric-card blue">
          <div class="label">Total Sales</div>
          <div class="value">${data.sales.total.toLocaleString()}</div>
        </div>
        <div class="metric-card green">
          <div class="label">Revenue</div>
          <div class="value">$${data.revenue.total.toLocaleString()}</div>
        </div>
        <div class="metric-card purple">
          <div class="label">Purchases</div>
          <div class="value">$${data.purchases.total.toLocaleString()}</div>
        </div>
        <div class="metric-card orange">
          <div class="label">Active Users</div>
          <div class="value">${data.users.users}</div>
        </div>
      </div>

      <!-- Charts Section -->
      ${
        data.sales.chart.length > 0 || data.revenue.chart.length > 0
          ? `
      <div class="section">
        <h2 class="section-title">📈 Performance Trends</h2>
        <div class="charts-grid">
          ${
            data.sales.chart.length > 0
              ? `
          <div class="chart-container">
            <div class="chart-title">Sales Overview (Last ${Math.min(data.sales.chart.length, 15)} Days)</div>
            <div class="bar-chart">
              ${data.sales.chart
                .slice(-15)
                .map((item) => {
                  const height = (item.value / maxSalesValue) * 100;
                  const date = new Date(item.date);
                  return `
                  <div class="bar" style="height: ${height}%">
                    <div class="bar-value">${item.value > 0 ? item.value : ""}</div>
                    <div class="bar-label">${date.getMonth() + 1}/${date.getDate()}</div>
                  </div>
                `;
                })
                .join("")}
            </div>
          </div>
          `
              : ""
          }

          ${
            data.revenue.chart.length > 0
              ? `
          <div class="chart-container">
            <div class="chart-title">Revenue Trend (Last ${Math.min(data.revenue.chart.length, 15)} Days)</div>
            <div class="bar-chart">
              ${data.revenue.chart
                .slice(-15)
                .map((item) => {
                  const height = (item.value / maxRevenueValue) * 100;
                  const date = new Date(item.date);
                  return `
                  <div class="bar green" style="height: ${height}%">
                    <div class="bar-value">${item.value > 0 ? "$" + item.value.toLocaleString() : ""}</div>
                    <div class="bar-label">${date.getMonth() + 1}/${date.getDate()}</div>
                  </div>
                `;
                })
                .join("")}
            </div>
          </div>
          `
              : ""
          }
        </div>
      </div>
      `
          : ""
      }

      <!-- Debt Analysis -->
      <div class="section">
        <h2 class="section-title">💰 Debt Analysis</h2>
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th style="text-align: right;">Amount</th>
              <th style="text-align: right;">Percentage</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Outstanding Debt</strong></td>
              <td style="text-align: right; color: #dc2626; font-weight: 600;">$${data.debt.unreceived.toLocaleString()}</td>
              <td style="text-align: right;">${data.revenue.total > 0 ? ((data.debt.unreceived / data.revenue.total) * 100).toFixed(1) : "0"}%</td>
            </tr>
            <tr>
              <td><strong>Received Payments</strong></td>
              <td style="text-align: right; color: #059669; font-weight: 600;">$${data.debt.received.toLocaleString()}</td>
              <td style="text-align: right;">${data.revenue.total > 0 ? ((data.debt.received / data.revenue.total) * 100).toFixed(1) : "0"}%</td>
            </tr>
            <tr style="background: #f3f4f6; font-weight: 700;">
              <td>Net Balance</td>
              <td style="text-align: right;">$${(data.debt.received - data.debt.unreceived).toLocaleString()}</td>
              <td style="text-align: right;">-</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Top Products -->
      ${
        data.topProducts.length > 0
          ? `
      <div class="section">
        <h2 class="section-title">🏆 Top Selling Products</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 60px;">#</th>
              <th>Product Name</th>
              <th style="text-align: right;">Quantity Sold</th>
              <th style="text-align: right;">Performance</th>
            </tr>
          </thead>
          <tbody>
            ${data.topProducts
              .map((product, idx) => {
                const maxQty = data.topProducts[0]?.quantity || 1;
                const percentage = ((product.quantity / maxQty) * 100).toFixed(
                  0,
                );
                return `
                <tr>
                  <td style="text-align: center; font-weight: 700; color: #3b82f6;">${idx + 1}</td>
                  <td><strong>${product.name}</strong></td>
                  <td style="text-align: right; font-weight: 600;">${product.quantity.toLocaleString()}</td>
                  <td style="text-align: right;">
                    <div style="background: #e5e7eb; height: 8px; border-radius: 4px; overflow: hidden;">
                      <div style="background: linear-gradient(90deg, #3b82f6, #2563eb); height: 100%; width: ${percentage}%;"></div>
                    </div>
                  </td>
                </tr>
              `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
      `
          : ""
      }

      <!-- Inventory Status -->
      ${
        data.productStats.totalStockQuantity > 0
          ? `
      <div class="section">
        <h2 class="section-title">📦 Inventory Status</h2>
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th style="text-align: right;">Value</th>
              <th style="text-align: right;">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Total Stock Quantity</strong></td>
              <td style="text-align: right; font-weight: 600;">${data.productStats.totalStockQuantity.toLocaleString()}</td>
              <td style="text-align: right;"><span class="status completed">Healthy</span></td>
            </tr>
            <tr>
              <td><strong>Low Stock Items</strong></td>
              <td style="text-align: right; font-weight: 600; color: #f59e0b;">${data.productStats.lowStockProducts}</td>
              <td style="text-align: right;"><span class="status pending">Attention</span></td>
            </tr>
            <tr>
              <td><strong>Out of Stock</strong></td>
              <td style="text-align: right; font-weight: 600; color: #dc2626;">${data.productStats.zeroProducts}</td>
              <td style="text-align: right;">
                <span class="status ${data.productStats.zeroProducts > 0 ? "partial" : "completed"}">
                  ${data.productStats.zeroProducts > 0 ? "Critical" : "Good"}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      `
          : ""
      }

      <!-- Recent Sales -->
      ${
        data.recentSales.length > 0
          ? `
      <div class="section">
        <h2 class="section-title">🛒 Recent Sales (Last 10 Transactions)</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th style="text-align: right;">Total</th>
              <th style="text-align: right;">Paid</th>
              <th style="text-align: right;">Due</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.recentSales
              .slice(0, 10)
              .map(
                (sale) => `
              <tr>
                <td>${new Date(sale.saleDate).toLocaleDateString()}</td>
                <td>
                  <strong>${sale.customer?.name || "Walk-in"}</strong>
                  ${sale.customer?.phoneNumber ? `<br><span style="color: #6b7280; font-size: 11px;">${sale.customer.phoneNumber}</span>` : ""}
                </td>
                <td style="text-align: right; font-weight: 600;">$${sale.totalAmount.toFixed(2)}</td>
                <td style="text-align: right; color: #059669;">$${sale.amountPaid.toFixed(2)}</td>
                <td style="text-align: right; color: ${sale.amountDue > 0 ? "#dc2626" : "#6b7280"};">
                  $${sale.amountDue.toFixed(2)}
                </td>
                <td>
                  <span class="status ${sale.paymentStatus}">
                    ${sale.paymentStatus}
                  </span>
                </td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
      `
          : ""
      }

      <!-- Footer -->
      <div class="footer">
        <p>This is an automated report generated from your dashboard.</p>
        <p>© ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
}

import { getBrowser, closeBrowser } from "./puppeteerInstance";

export async function generatePDFFromData(
  data: DashboardData,
): Promise<Buffer> {
  const html = generateHTMLReport(data);
  const browser = await getBrowser();

  try {
    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle0",
      timeout: 30000,
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
