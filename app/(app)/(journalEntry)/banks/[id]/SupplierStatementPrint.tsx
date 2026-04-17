"use client";

import { Button } from "@/components/ui/button";
import { useCompany } from "@/hooks/useCompany";
import { PrinterIcon } from "lucide-react";
import React from "react";

export default function SupplierStatementPrint({
  banks,
}: {
  banks: any | undefined;
}) {
  const { company } = useCompany();

  if (!company) return <div>Loading...</div>;

  const handlePrint = () => {
    if (!banks) return;

    const printHTML = `
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap" rel="stylesheet">
        <title>كشف حساب  بنك</title>
</title>
        <style>
          body { 
            font-family: "Cairo", Arial, sans-serif; 
            direction: rtl; 
            background: #fff;
            color: #000;
            margin: 0;
            padding: 20px;
          }

          h1, h2 {
            text-align: center;
            margin: 0;
            padding: 0;
          }

          .section {
            padding: 6px 8px;
          }

          .header {
            border-bottom: 2px solid black;
            border-radius: 6px;
            margin-bottom: 20px;
            padding-bottom: 10px;
          }

          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .items-center { align-items: center; }
          .mb-2 { margin-bottom: 8px; }
          .gap-2 { gap: 8px; }
          .grid { display: grid; }
          .grid-rows-3 { grid-template-rows: repeat(3, auto); }
          .grid-rows-4 { grid-template-rows: repeat(4, auto); }
          .text-sm { font-size: 12px; }
          .text-lg { font-size: 16px; font-weight: bold; }
          .text-center { text-align: center; }
          .text-xs { font-size: 10px; }
          .green { color: green; }
          .grey { color: grey; }
          .text-3xl { font-size: 24px; font-weight: bold; }
          .text-2xl { font-size: 23px; font-weight: bold; }

          .info-box {
            margin-top: 20px;
            padding: 10px;
            border: 1px solid #000;
            border-radius: 6px;
            background: #f9f9f9;
          }

          .info-box p {
            margin: 5px 0;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          
          th, td {
            border: 1px solid #000;
            padding: 8px;
            font-size: 13px;
            text-align: center;
          }
          
          th {
            background: #39dd83;
            color: #fff;
            font-weight: bold;
          }

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

          .balance-highlight {
            background: #ecf0f1;
            font-weight: bold;
          }
        </style>
      </head>

      <body>
        <div class="section">
          <div class="flex header justify-between items-center mb-2" dir="rtl">
            <!-- Company -->
            <div class="grid grid-rows-3 gap-2">
              <span class="text-3xl green font-bold">${company?.name}</span>
              <span class="text-2xl">${company?.name}</span>
            </div>

            <!-- Logo -->
            <div class="flex flex-col items-center">
              <img src="${company?.logoUrl ?? ""}" style="width: 100px; height: 90px;" />
            </div>

            <!-- Branch -->
            <div class="grid grid-rows-4">
              <div class="text-lg">${company?.address ?? ""}</div>
              <div class="text-lg">${company?.city ?? ""}</div>
              <div>تلفون: ${company?.phone ?? ""}</div>
            </div>
          </div>
        </div>

<h2>🏦 كشف حساب بنك</h2>

        <div class="info-box">
         <p><strong>اسم البنك:</strong> ${banks.bank?.name}</p>
<p><strong>رقم الحساب:</strong> ${banks.bank?.accountNumber}</p>
<p><strong>العملة:</strong> ${banks.bank?.currency}</p>

        </div>

        <table>
          <thead>
            <tr>
             <th>التاريخ</th>
<th>نوع العملية</th>
<th>رقم المستند</th>
<th>البيان</th>
<th>مدين (سحب)</th>
<th>دائن (إيداع)</th>
<th>الرصيد</th>

          </thead>

          <tbody>
            <tr class="balance-highlight">
              <td></td>
              <td>رصيد افتتاحي</td>
              <td>—</td>
              <td>رصيد افتتاحي للمورد</td>
              <td>${
                banks.openingBalance > 0
                  ? banks.openingBalance.toFixed(2)
                  : "0.00"
              }</td>
      <td>${
        banks.openingBalance < 0
          ? Math.abs(banks.openingBalance).toFixed(2)
          : "0.00"
      }</td>
              <td>${banks.openingBalance.toFixed(2)}</td>
            </tr>

            ${banks.transactions
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

            <tr class="balance-highlight">
              <td colspan="3"><strong>الإجمالي</strong></td>
              <td></td>
              <td><strong>${banks.totalDebit.toFixed(2)}</strong></td>
              <td><strong>${banks.totalCredit.toFixed(2)}</strong></td>
              <td><strong>${banks.closingBalance.toFixed(2)}</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="totals">
          <p>إجمالي المشتريات (مدين): ${banks.totalDebit.toFixed(2)} ر.ي</p>
          <p>إجمالي المدفوعات (دائن): ${banks.totalCredit.toFixed(2)} ر.ي</p>
          <p style="color: red;">الرصيد النهائي المستحق: ${banks.closingBalance.toFixed(2)} ر.ي</p>
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
        }, 1000);
      }
    };
  };

  return (
    <Button onClick={handlePrint} className="rounded">
      <PrinterIcon color="green" /> طباعة
    </Button>
  );
}
