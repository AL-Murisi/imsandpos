"use client";

import { Button } from "@/components/ui/button";
import { useCompany } from "@/hooks/useCompany";
import { PrinterIcon } from "lucide-react";
import React from "react";

export default function SupplierStatementPrint({
  suppliers,
}: {
  suppliers: any | undefined;
}) {
  const { company } = useCompany();

  if (!company) return <div>Loading...</div>;
  const formattedName = company?.name.split(" ").reduce((acc, word, i) => {
    return acc + word + (i === 1 ? "<br/>" : " ");
  }, "");
  const getCurrencyLabel = (currency: string) => {
    switch (currency?.toLowerCase()) {
      case "usd":
        return "دولار أمريكي";
      case "yer":
        return "ريال يمني";
      case "sar":
        return "ريال سعودي";
      default:
        return currency || "";
    }
  };

  // Get the label based on the first transaction's currency
  const currencyLabel = getCurrencyLabel(suppliers.transactions[0]?.Currency);
  const handlePrint = () => {
    if (!suppliers) return;

    const printHTML = `
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap" rel="stylesheet">
        <title>كشف حساب مورد</title>
        <style>
          body { 
            font-family: "Cairo", Arial, sans-serif; 
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
  display: grid;
  /* Creates two columns of equal width */
  grid-template-columns: repeat(2, 1fr); 
  gap: 10px 10px; /* 10px vertical gap, 20px horizontal gap */
 
  padding: 15px;
  border: 1px solid #ddd; /* Lighter border for cleaner look */
  border-radius: 8px;
  background: #f9f9f9;
  direction: rtl; /* Ensures grid flows correctly for Arabic */
}

.info-box p {
  margin: 0; /* Remove default paragraph margins to keep grid tight */
  font-size: 14px;
  line-height: 1.6;
}

/* Optional: Make the Address or Balance span full width if it's too long */
.full-width {
  grid-column: span 2;
}

          .info-box p {
            margin: 5px 0;
          }

          table {
            width: 100%;
           ;width: 100%;
    border-collapse: separate; /* Required for border-radius */
    border-spacing: 0;
    margin-top: 15px;
    border: 1px solid #000;
    border-radius: 8px; /* Rounded corners for the table */
    overflow: hidden;
         
          }
          
          th, td {
            border: 1px solid #000;
            padding: 8px;
            font-size: 13px;
            text-align: center;
          }
          
          th {
            background: #39dd83;
        
            font-weight: bold;
          }

          .totals {
            margin-top: 20px;
            font-size: 16px;
            font-weight: bold;
            border-top: 2px solid #000;
            padding-top: 10px;
          }
/* Container for logo and title to stack them */
.logo-title-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

/* The small box for the title */
.title-box {
  border: 1px solid #000;
  padding: 4px 12px;
  border-radius: 4px;
  background-color: #f0f0f0;
  font-size: 14px;
  font-weight: bold;
  white-space: nowrap;
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
            <div class="grid grid-rows-2 gap-2">
        
              <div class="text-3xl font-bold text-green-600 leading-tight">
                ${formattedName}
              </div>
              <span class="text-2xl">${company?.phone ?? ""}</span>
            </div>

            <!-- Logo -->
            <div class="logo-title-container">
              <img src="${company?.logoUrl ?? ""}" style="width: 100px; height: 100px; object-fit: contain;" />
              <div class="title-box">
                📋 كشف حساب مورد
              </div>
             </div>

            <!-- Branch -->
            <div class="grid grid-rows-2">
              <div class="text-lg">${company?.address ?? ""}</div>
              <div class="text-lg">${company?.city ?? ""}</div>
             
            </div>
              
          </div>
        </div>

        

       <div class="info-box">
  <p><strong>اسم المورد:</strong> ${suppliers.supplier?.name ?? ""}</p>
  <p><strong>الهاتف:</strong> ${suppliers.supplier?.phoneNumber ?? ""}</p>
  
  
  <p><strong>من تاريخ:</strong> ${suppliers.period.from}</p>
  <p><strong>إلى تاريخ:</strong> ${suppliers.period.to}</p>
  
  <p><strong>الرصيد الافتتاحي:</strong> ${suppliers.openingBalance.toFixed(2)}</p>
  
<p  >
    <strong> العمله:</strong>  ${currencyLabel}
  </p>
</div>

        <table>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>نوع السند</th>
              
              <th>البيان</th>
              <th>مدين</th>
              <th>دائن</th>
              <th>الرصيد</th>
            </tr>
          </thead>

          <tbody>
           ${
             Number(suppliers.openingBalance) !== 0
               ? `
    <tr class="balance-highlight">
       <td>-</td>   
      <td>رصيد افتتاحي</td>
      <td>رصيد افتتاحي للمورد</td>
 
      <td>${suppliers.openingBalance < 0 ? Math.abs(suppliers.openingBalance).toFixed(2) : "0.00"}</td>     <td>${suppliers.openingBalance > 0 ? suppliers.openingBalance.toFixed(2) : "0.00"}</td>
      <td><strong>${suppliers.openingBalance.toFixed(2)}</strong></td>
    </tr>
    `
               : ""
           }


            ${suppliers.transactions
              .map(
                (t: any) => `
              <tr>
                <td>${new Date(t.date).toLocaleDateString("ar-EG")}</td>
                <td>${t.typeName ?? ""}</td>
             
                <td>${t.description ?? ""}</td>
                <td>${t.debit > 0 ? t.debit.toFixed(2) : "-"}</td>
                <td>${t.credit > 0 ? t.credit.toFixed(2) : "-"}</td>
                <td>${t.balance.toFixed(2)}</td>
              </tr>`,
              )
              .join("")}

            <tr class="balance-highlight">
              <td colspan="2"><strong>الإجمالي</strong></td>
              <td></td>
              <td><strong>${suppliers.totalDebit.toFixed(2)}</strong></td>
              <td><strong>${suppliers.totalCredit.toFixed(2)}</strong></td>
              <td><strong>${suppliers.closingBalance.toFixed(2)}</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="totals">
          <p>إجمالي المشتريات (مدين): ${suppliers.totalDebit.toFixed(2)} </p>
          <p>إجمالي المدفوعات (دائن): ${suppliers.totalCredit.toFixed(2)} </p>
          <p style="color: red;">الرصيد النهائي المستحق: ${suppliers.closingBalance.toFixed(2)} </p>
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

  return (
    <Button onClick={handlePrint} className="rounded">
      <PrinterIcon color="green" /> طباعة
    </Button>
  );
}
