"use client";

import React from "react";
import { Button } from "../ui/button";

export interface ReceiptItem {
  id: string;
  name: string;
  warehousename: string;
  selectedQty: number;
  sellingUnit: string;
  pricePerUnit?: number;
  pricePerPacket?: number;
  pricePerCarton?: number;
}

export interface ReceiptProps {
  saleNumber: string;
  items: ReceiptItem[];
  totals: {
    totalBefore: number;
    discount: number;
    totalAfter: number;
  };
  receivedAmount?: number;
  calculatedChange: number;
  userName?: string;
  customerName?: string;
  customerDebt?: number;
  isCash: boolean;
  t: any;
}

export const Receipt: React.FC<ReceiptProps> = ({
  saleNumber,
  items,
  totals,
  receivedAmount,
  calculatedChange,
  userName,
  customerName,
  customerDebt,
  isCash,
  t,
}) => {
  const getItemPrice = (item: ReceiptItem) => {
    switch (item.sellingUnit) {
      case "unit":
        return item.pricePerUnit ?? 0;
      case "packet":
        return item.pricePerPacket ?? 0;
      case "carton":
        return item.pricePerCarton ?? 0;
      default:
        return 0;
    }
  };

  const handlePrint = () => {
    const dateOptions: Intl.DateTimeFormatOptions = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    };
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    };

    const formattedDate = new Date().toLocaleDateString("ar-EG", dateOptions);
    const formattedTime = new Date().toLocaleTimeString("ar-EG", timeOptions);

    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Receipt</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              direction: rtl;
              background: #fff;
              color: #000;
              margin: 0;
              padding: 20px;
            }

            .receipt-container {
              width: 100%;
              max-width: 800px;
              margin: 0 auto;
              border: 2px solid #000;
              border-radius: 12px;
              padding: 15px;
              display: flex;
              flex-direction: column;
            }

            .section {
              padding: 6px 8px;
            }

            .header {
              border-bottom: 1px solid black;
              border-radius: 6px;
            }

            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .items-center { align-items: center; }
            .mb-2 { margin-bottom: 8px; }
            .gap-2 { gap: 8px; }
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
            .text-sm { font-size: 12px; }
            .text-lg { font-size: 16px; font-weight: bold; }
            .text-center { text-align: center; }
            .text-xs { font-size: 10px; }
            .green { color: green; }
            .grey { color: grey; }
            .text-3xl { font-size: 24px; font-weight: bold; }
            .text-2xl { font-size: 23px; font-weight: bold; }

            table {
              width: 100%;
              border-collapse: collapse;
              margin: 0;
            }

            th, td {
              border: 1px solid black;
              padding: 4px;
              text-align: center;
              font-size: 12px;
            }

            .h { height: 30px; }
            
            th {
              background-color: #f0f0f0;
            }

            .totals-label {
              width: 80px;
              text-align: right;
            }

            .totals-value {
              width: 160px;
              border: 1px solid black;
              border-radius: 6px;
              padding: 4px;
              text-align: right;
            }

            .pl { 
              padding-top: 3px;
              padding-bottom: 3px;
            }

            .badge {
              display: inline-block;
              background: #f0f0f0;
              padding: 2px 6px;
              border-radius: 8px;
              margin-right: 4px;
            }

            .grid-rows-3 {
              grid-template-rows: repeat(3, auto);
            }

            .grid-rows-4 {
              grid-template-rows: repeat(4, auto);
            }

            .items-baseline {
              align-items: baseline;
            }

            .text-right {
              text-align: right;
            }

            .flex-col {
              flex-direction: column;
            }

            .gap-4 {
              gap: 16px;
            }

            .my-1 {
              margin-top: 4px;
              margin-bottom: 4px;
            }

            @media print {
              body {
                border: none;
              }
            }

            /* Print button styling */
            .print-button {
              position: fixed;
              top: 10px;
              left: 10px;
              padding: 10px 20px;
              background: #22c55e;
              color: white;
              border: none;
              border-radius: 6px;
              font-size: 16px;
              cursor: pointer;
              z-index: 1000;
            }

            .print-button:hover {
              background: #16a34a;
            }

            @media print {
              .print-button {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <button class="print-button" onclick="window.print();">طباعة 🖨️</button>
          
          <div class="receipt-container">

            <!-- HEADER -->
            <div class="section">
              <div class="flex header justify-between items-center mb-2" dir="rtl">
                <!-- Company -->
                <div class="grid grid-rows-3 items-baseline gap-2 text-right">
                  <span class="text-3xl green font-bold">مؤسسة عادل الرياشي</span>
                  <span class="text-2xl">للتجارة والاستيراد</span>
                  <div>رقم الفاتورة: ${saleNumber}</div>
                </div>

                <!-- Logo -->
                <div class="flex flex-col items-center">
                  <img src="/logo.png" alt="Logo" style="width: 100px; height: 90px;" />
                </div>

                <!-- Branch -->
                <div class="grid grid-rows-4">  
                  <div class="text-lg">فرع سناح - أمام محطة الصيادي</div>
                  <div>تلفون: 772222599</div>
                  <div>التاريخ: ${formattedDate}</div>
                  <div>الوقت: ${formattedTime}</div>
                </div>
              </div>
            </div>

            <div class="section">
              نوع الدفع: ${isCash ? "نقدي" : "آجل"}<br/>
              <div>العميل: <span class="badge">${customerName ?? "بدون"}</span></div>
            </div>

            <!-- TABLE -->
            <table>
              <thead>
                <tr>
                  <th>م</th>
                  <th>المنتج</th>
                  <th>المستودع</th>
                  <th>الكمية</th>
                  <th>النوع</th>
                  <th>السعر</th>
                  <th>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                ${items
                  .map(
                    (item, index) => `
                    <tr>
                      <td>${index + 1}</td>
                      <td>${item.name}</td>
                      <td>${item.warehousename}</td>
                      <td>${item.selectedQty}</td>
                      <td>${item.sellingUnit}</td>
                      <td>${getItemPrice(item)}</td>
                      <td>${(getItemPrice(item) * item.selectedQty).toFixed(2)}</td>
                    </tr>
                  `,
                  )
                  .join("")}
              </tbody>
            </table>

            <!-- TOTALS -->
            <div class="section">
              <div class="flex justify-between">
                <div>
                  <div class="flex gap-4 text-sm my-1 pl">
                    <span class="totals-label">الخصم:</span>
                    <span class="totals-value">${totals.discount.toFixed(2)} ﷼</span>
                  </div>
                  <div class="flex gap-4 text-sm my-1 pl">
                    <span class="totals-label">الإجمالي:</span>
                    <span class="totals-value">${totals.totalAfter.toFixed(2)} ﷼</span>
                  </div>
                  <div class="flex gap-4 text-sm my-1 pl">
                    <span class="totals-label">المبلغ المدفوع:</span>
                    <span class="totals-value">${receivedAmount?.toFixed(2) ?? 0} ﷼</span>
                  </div>
                  <div class="flex gap-4 text-sm my-1 pl ${calculatedChange > 0 ? "green" : "grey"}">
                    <span class="totals-label">المتبقي للعميل:</span>
                    <span class="totals-value">${calculatedChange.toFixed(2)} ﷼</span>
                  </div>
                  <div>👨‍💼 الكاشير: ${userName ?? "غير محدد"}</div>
                </div>

                ${
                  customerDebt && customerDebt > 0
                    ? `
                      <div class="flex gap-2 text-sm h">
                        <span>ديون سابقة:</span>
                        <span class="totals-value">${customerDebt} ﷼</span>
                      </div>
                    `
                    : ""
                }
              </div>
            </div>

            <!-- FOOTER -->
            <div class="section text-center text-xs">
              <p>شكرًا لتسوقك معنا!</p>
            </div>
          </div>
          
          <script>
            // Close window after print
            window.onafterprint = function() {
              window.close();
            };
          </script>
        </body>
      </html>
    `;

    // Use window.open instead of iframe for better mobile support
    const printWindow = window.open("", "_blank", "width=800,height=600");

    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printHTML);
      printWindow.document.close();
    } else {
      // Fallback: Create blob URL and open in new tab
      const blob = new Blob([printHTML], { type: "text/html" });
      const blobUrl = URL.createObjectURL(blob);
      const newWindow = window.open(blobUrl, "_blank");

      // Clean up blob URL after a delay
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 1000);
    }
  };

  return (
    <Button
      onClick={handlePrint}
      className="sm:w-4xs w-40 rounded bg-green-600 px-4 py-2 text-white md:w-sm"
    >
      {t("print")}
    </Button>
  );
};
