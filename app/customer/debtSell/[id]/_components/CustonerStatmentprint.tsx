"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar22 } from "@/components/common/DatePicker";
import { useCompany } from "@/hooks/useCompany";
import React from "react";
import { Button } from "@/components/ui/button";
import { PrinterIcon } from "lucide-react";

export default function CustomerStatementPrint({
  customers,
}: {
  customers: any | undefined;
}) {
  const { company } = useCompany();

  if (!company) return <div>Loading...</div>;

  // ================================
  //  🔥 NEW PRINT FUNCTION (FULL HTML)
  // ================================
  const handlePrint = () => {
    if (!customers) return;

    const printHTML = `
      <html lang="ar" dir="rtl">
      <head>
        <title>كشف حساب عميل</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            direction: rtl; 
               background: #fff;
              color: #000;
           
              margin: 0;
          }

          h1, h2 {
            text-align: center;
            margin: 0;
            padding: 0;
          }

          .header {
            text-align: center;
            margin-bottom: 15px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }

          .info-box {
            margin-top: 20px;
            padding: 10px;
            border: 1px solid #000;
            border-radius: 6px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border: 1px solid #000;
            padding: 6px;
            font-size: 13px;
            text-align: center;
          }
          th {
            background: #f0f0f0;
            font-weight: bold;
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

          .totals {
            margin-top: 20px;
            font-size: 16px;
            font-weight: bold;
            border-top: 2px solid #000;
            padding-top: 10px;
          }

          footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            border-top: 1px solid #000;
            padding-top: 10px;
          }
        </style>
      </head>

      <body>

         <div class="section">
              <div class="flex header justify-between items-center mb-2" dir="rtl">
                <!-- Company -->
                <div class="grid grid-rows-3 items-baseline gap-2 text-right">
                  <span class="text-3xl green font-bold">  ${company?.name} </span>
                  <span class="text-2xl">${company?.name} </span>
                </div>

                <!-- Logo -->
                <div class="flex flex-col items-center">
                  <img src="${company?.logoUrl ?? ""}" style="width: 100px; height: 90px;" />
                </div>

                <!-- Branch -->
                <div class="grid grid-rows-4">
                  <div class="text-lg">  ${company?.address} </div>  <div class="text-lg">  ${company?.city} </div>
                  <div>تلفون:  ${company?.phone}</div>

                </div>
              </div>
            </div>

        <h2>🧾 كشف حساب عميل</h2>

        <div class="info-box">
          <p><strong>اسم العميل:</strong> ${customers.customer?.name ?? ""}</p>
          <p><strong>الهاتف:</strong> ${customers.customer?.phoneNumber ?? ""}</p>
          <p><strong>من تاريخ:</strong> ${customers.period.from}</p>
          <p><strong>إلى تاريخ:</strong> ${customers.period.to}</p>
          <p><strong>الرصيد الافتتاحي:</strong> ${customers.openingBalance.toFixed(2)} ر.ي</p>
          <p><strong>الرصيد الحالي:</strong> ${customers.closingBalance.toFixed(2)} ر.ي</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>نوع السند</th>
              <th>رقم المستند</th>
              <th>البيان</th>
              <th>مدين</th>
              <th>دائن</th>
              <th>الرصيد</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td></td>
              <td>رصيد افتتاحي</td>
              <td>—</td>
              <td>${customers.openingBalance.toFixed(2)}</td>
              <td>${customers.openingBalance.toFixed(2)}</td>
              <td>0.00</td>
              <td>${customers.openingBalance.toFixed(2)}</td>
            </tr>

            ${customers.transactions
              .map(
                (t: any) => `
              <tr>
                <td>${new Date(t.date).toLocaleDateString("ar-EG")}</td>
                <td>${t.typeName ?? ""}</td>
                <td>${t.docNo ?? ""}</td>
                <td>${t.description ?? ""}</td>
                <td>${t.debit > 0 ? t.debit.toFixed(2) : "-"}</td>
                <td>${t.credit > 0 ? t.credit.toFixed(2) : "-"}</td>
                <td>${t.balance.toFixed(2)}</td>
              </tr>`,
              )
              .join("")}
          </tbody>
        </table>

        <div class="totals">
          <p>إجمالي المدين: ${customers.totalDebit.toFixed(2)} ر.ي</p>
          <p>إجمالي الدائن: ${customers.totalCredit.toFixed(2)} ر.ي</p>
          <p>الرصيد النهائي: ${customers.closingBalance.toFixed(2)} ر.ي</p>
        </div>

        <footer>
          تمت الطباعة بتاريخ ${new Date().toLocaleDateString("ar-EG")}
          — الساعة ${new Date().toLocaleTimeString("ar-EG", { hour12: false })}
          <br/>
          شكرًا لتعاملكم معنا
        </footer>

      </body>
      </html>
    `;

    const iframe = document.createElement("iframe");
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";

    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(printHTML);
    doc.close();

    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();

    setTimeout(() => document.body.removeChild(iframe), 1000);
  };

  // ===========================
  //  UI
  // ===========================
  return (
    <Button onClick={handlePrint} className="rounded">
      <PrinterIcon color="green" /> طباعة
    </Button>
  );
}
