"use client";

import React, { useState } from "react";
import { Button } from "../ui/button";
import { useFormatter } from "@/hooks/usePrice";
import { Clock } from "lucide-react";
type Company =
  | {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      address: string | null;
      city: string | null;
      country: string | null;
      logoUrl: string | null;
      branches: {
        name: string;
        location: string | null;
      }[];
    }
  | undefined;

export interface ReceiptItem {
  id: string;
  name: string;
  warehousename: string;
  selectedQty: number;
  sellingUnit: string;
  unit_price: number;
  pricePerUnit?: number;
  total: number;
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
  company: Company;
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
  company,
}) => {
  const { formatCurrency, formatPriceK, formatQty } = useFormatter();

  const handlePrint = () => {
    if ((window as any).__printing) return;
    (window as any).__printing = true;
    console.log("Preparing to print receipt...", items);
    const printHTML = `
      <html>
        <head>
          <title>Receipt</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              direction: rtl;
              background: #fff;
              color: #000;
              border: 1px solid #000;
              border-radius: 6px;
              margin: 0;
            }
.test{}
            .receipt-container {
              width: 100%;
              border-collapse: collapse;
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
            }.footer-info {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        margin-top: 6px;
        color: #000;
      }

      .footer-info div {
        text-align: left;
        direction: ltr;
      }

            th, td {
              border: 1px solid black;
              padding: 4px;
              text-align: center;
              font-size: 12px;
            }
.h{height: 30px;}
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
            }footer {
  position: fixed;
  bottom: 0;
  right: 0;
  left: 0;
  border-top: 1px solid #000;
  padding: 4px 12px;
  font-size: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
}

.footer-content {
  width: 100%;
  display: flex;
  justify-content: space-between;
  direction: rtl;
}

.cashier {
  display: flex;
  align-items: center;
  gap: 4px;
}

.datetime {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pl{padding-top:3px;padding-bottom:3px;}
            .badge {
              display: inline-block;
              background: #f0f0f0;
              padding: 2px 6px;
              border-radius: 8px;
              margin-right: 4px;
            }
          </style>
        </head>
        <body>

          <div class="receipt-container">

            <!-- HEADER -->
            <div class="section">
              <div class="flex header justify-between items-center mb-2" dir="rtl">
                <!-- Company -->
                <div class="grid grid-rows-3 items-baseline gap-2 text-right">
                  <span class="text-3xl green font-bold">  ${company?.name} </span>
                  <span class="text-xl">${company?.branches[0].name} </span>
                    <span class="text-xl">${company?.branches[0].location} </span>

               
                </div>

                <!-- Logo -->
                <div class="flex flex-col items-center">
                  <img src="${company?.logoUrl ?? ""}" style="width: 100px; height: 90px;" />
                </div>

                <!-- Branch -->
                <div class="grid grid-rows-4">
                  <div class="text-lg">  ${company?.address}</div>  
                  <div class="text-lg">  ${company?.city} </div>
                  <div>تلفون:  ${company?.phone}</div>
                  

                </div>
              </div>
            </div>

            <div class="section">
               <div>رقم الفاتورة: ${saleNumber}</div>
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
               .map((item, index) => {
                 // نضمن أن القيم أرقام قبل الحساب لمنع ظهور NaN

                 return `
      <tr>
        <td>${index + 1}</td>
        <td>${item.name}</td>
        <td>${item.warehousename}</td>
        <td>${item.selectedQty}</td>
        <td>${item.sellingUnit}</td>
        <td>${item.unit_price}</td>
        <td>${item.total}</td>
      </tr>
    `;
               })
               .join("")}
              </tbody>
            </table>

            <!-- TOTALS -->
            <div class="section">
              <div class="flex justify-between">
                <div>
                  <div class="flex gap-4 text-sm my-1 pl">
                    <span class="totals-label">الخصم:</span>
                    <span class="totals-value">${formatCurrency(Number(totals.discount.toFixed(2)))} </span>
                  </div>
                  <div class="flex gap-4 text-sm my-1 l">
                    <span class="totals-label">الإجمالي:</span>
                    <span class="totals-value">${formatCurrency(Number(totals.totalAfter.toFixed(2)))} </span>
                  </div>
                  <div class="flex gap-4 text-sm my-1 pl">
                    <span class="totals-label">المبلغ المدفوع:</span>
                    <span class="totals-value">${formatCurrency(Number(receivedAmount?.toFixed(2) ?? 0))} </span>
                  </div>
                  <div class="flex gap-4 text-sm my-1 pl> ${calculatedChange > 0 ? "green" : "grey"}">
                    <span class="totals-label">المتبقي للعميل:</span>
                    <span class="totals-value">${formatCurrency(Number(calculatedChange.toFixed(2)))} </span>
                  </div>

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
            <!-- FOOTER -->
<div class="section text-center text-xs">
  <p>شكرًا لتسوقك معنا!</p>
</div>

<!-- CASHIER + DATE/TIME -->
<footer class="footer">
  <div class="footer-content">
    <div class="cashier">
      👨‍💼 الكاشير: ${userName ?? "غير محدد"}
    </div>
    <div class="datetime">
      📅 التاريخ: ${new Date().toLocaleDateString("ar-EG")} &nbsp;&nbsp;
      ⏰ الوقت: ${new Date().toLocaleTimeString("ar-EG", { hour12: false })}
    </div>
  </div>
</footer>

        </body>
          <div class="footer-info">

      </html>
    `;
    const iframe = document.createElement("iframe");

    // Styles to hide the iframe
    Object.assign(iframe.style, {
      position: "fixed",
      right: "0",
      bottom: "0",
      width: "0",
      height: "0",
      border: "none",
      visibility: "hidden",
    });

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      (window as any).__printing = false;
      setIsLoading2(false);
      return;
    }

    doc.open();
    doc.write(printHTML);
    doc.close();

    // Wait for resources (images/styles) to load inside the iframe
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error("Printing failed", e);
      } finally {
        // Small delay to ensure the print dialog opened before removing the iframe
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          (window as any).__printing = false;
          setIsLoading2(false);
        }, 1000);
      }
    };
    // ✅ Use hidden iframe for mobile/PWA-safe printing
    // const iframe = document.createElement("iframe");
    // iframe.style.position = "fixed";
    // iframe.style.right = "0";
    // iframe.style.bottom = "0";
    // iframe.style.width = "0";
    // iframe.style.height = "0";
    // iframe.style.border = "none";
    // document.body.appendChild(iframe);
    // iframe.onload = () => {
    //   try {
    //     iframe.contentWindow?.focus();
    //     iframe.contentWindow?.print();
    //   } finally {
    //     setTimeout(() => {
    //       document.body.removeChild(iframe);
    //       (window as any).__printing = false;
    //     }, 500);
    //   }
    // };

    // const doc = iframe.contentWindow?.document;
    // if (!doc) return;
    // doc.open();
    // doc.write(printHTML);
    // doc.close();
    // setTimeout(() => {
    //   document.body.removeChild(iframe);
    //   setIsLoading2(false);
    // }, 1000);
  };
  const [isLoading2, setIsLoading2] = useState(false);

  return (
    <Button
      className="rounded bg-green-600 px-4 py-2 text-white"
      disabled={isLoading2}
      onClick={() => {
        setIsLoading2(true);
        handlePrint(); // call the function
      }}
    >
      {isLoading2 && <Clock className="h-4 w-4 animate-spin" />}
      {isLoading2 ? "جاري الطباعة..." : t("print")}
    </Button>
  );
};
