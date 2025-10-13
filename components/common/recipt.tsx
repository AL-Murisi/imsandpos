// "use client";

// import React from "react";
// import { Button } from "../ui/button";

// export interface ReceiptItem {
//   id: string;
//   name: string;
//   warehousename: string;
//   selectedQty: number;
//   sellingUnit: "unit" | "packet" | "carton";
//   pricePerUnit?: number;
//   pricePerPacket?: number;
//   pricePerCarton?: number;
// }

// export interface ReceiptProps {
//   saleNumber: string;
//   items: ReceiptItem[];
//   totals: {
//     totalBefore: number;
//     discount: number;
//     totalAfter: number;
//   };
//   receivedAmount?: number;
//   calculatedChange: number;
//   userName?: string;
//   customerName?: string;
//   customerDebt?: number;
//   isCash: boolean;
//   t: any;
// }

// export const Receipt: React.FC<ReceiptProps> = ({
//   saleNumber,
//   items,
//   totals,
//   receivedAmount,
//   calculatedChange,
//   userName,
//   customerName,
//   customerDebt,
//   isCash,
//   t,
// }) => {
//   const getItemPrice = (item: ReceiptItem) => {
//     switch (item.sellingUnit) {
//       case "unit":
//         return item.pricePerUnit ?? 0;
//       case "packet":
//         return item.pricePerPacket ?? 0;
//       case "carton":
//         return item.pricePerCarton ?? 0;
//       default:
//         return 0;
//     }
//   };
//   const unitToArabic = (sellingUnit: "unit" | "packet" | "carton") => {
//     switch (sellingUnit) {
//       case "unit":
//         return "حبة";
//       case "packet":
//         return "كيس";
//       case "carton":
//         return "كرتون";
//       default:
//         return "";
//     }
//   };

//   const handlePrint = () => {
//     const printHTML = `
//       <html>
//         <head>
//           <title>Receipt</title>
//           <style>
//             body {
//               font-family: Arial, sans-serif;
//               direction: rtl;
//               background: #fff;
//               color: #000;
//               border: 1px solid #000;
//               border-radius: 6px;
//               margin: 0;
//             }
// .test{}
//             .receipt-container {
//               width: 100%;
//               border-collapse: collapse;
//               display: flex;
//               flex-direction: column;
//             }

//             .section {
//               padding: 6px 8px;
//             }

//             .header {
//               border-bottom: 1px solid black;
//               border-radius: 6px;
//             }

//             .flex { display: flex; }
//             .justify-between { justify-content: space-between; }
//             .items-center { align-items: center; }
//             .mb-2 { margin-bottom: 8px; }
//             .gap-2 { gap: 8px; }
//             .grid { display: grid; }
//             .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
//             .text-sm { font-size: 12px; }
//             .text-lg { font-size: 16px; font-weight: bold; }
//             .text-center { text-align: center; }
//             .text-xs { font-size: 10px; }
//             .green { color: green; }
//             .grey { color: grey; }
//             .text-3xl { font-size: 24px; font-weight: bold; }
//             .text-2xl { font-size: 23px; font-weight: bold; }

//             table {
//               width: 100%;
//               border-collapse: collapse;
//               margin: 0;
//             }.footer-info {
//         display: flex;
//         justify-content: space-between;
//         font-size: 11px;
//         margin-top: 6px;
//         color: #000;
//       }

//       .footer-info div {
//         text-align: left;
//         direction: ltr;
//       }

//             th, td {
//               border: 1px solid black;
//               padding: 4px;
//               text-align: center;
//               font-size: 12px;
//             }
// .h{height: 30px;}
//             th {
//               background-color: #f0f0f0;
//             }

//             .totals-label {
//               width: 80px;
//               text-align: right;
//             }

//             .totals-value {
//               width: 160px;
//               border: 1px solid black;
//               border-radius: 6px;
//               padding: 4px;
//               text-align: right;
//             }footer {
//   position: fixed;
//   bottom: 0;
//   right: 0;
//   left: 0;
//   border-top: 1px solid #000;
//   padding: 4px 12px;
//   font-size: 12px;
//   display: flex;
//   justify-content: space-between;
//   align-items: center;
//   background: #fff;
// }

// .footer-content {
//   width: 100%;
//   display: flex;
//   justify-content: space-between;
//   direction: rtl;
// }

// .cashier {
//   display: flex;
//   align-items: center;
//   gap: 4px;
// }

// .datetime {
//   display: flex;
//   align-items: center;
//   gap: 8px;
// }

// .pl{padding-top:3px;padding-bottom:3px;}
//             .badge {
//               display: inline-block;
//               background: #f0f0f0;
//               padding: 2px 6px;
//               border-radius: 8px;
//               margin-right: 4px;
//             }
//           </style>
//         </head>
//         <body>

//           <div class="receipt-container">

//             <!-- HEADER -->
//             <div class="section">
//               <div class="flex header justify-between items-center mb-2" dir="rtl">
//                 <!-- Company -->
//                 <div class="grid grid-rows-3 items-baseline gap-2 text-right">
//                   <span class="text-3xl green font-bold">مؤسسة عادل الرياشي</span>
//                   <span class="text-2xl">للتجارة والاستيراد</span>
//                   <div>رقم الفاتورة: ${saleNumber}</div>
//                 </div>

//                 <!-- Logo -->
//                 <div class="flex flex-col items-center">
//                   <img src="/logo.png" alt="Logo" style="width: 100px; height: 90px;" />
//                 </div>

//                 <!-- Branch -->
//                 <div class="grid grid-rows-4">
//                   <div class="text-lg">فرع سناح - أمام محطة الصيادي</div>
//                   <div>تلفون: 772222599</div>

//                 </div>
//               </div>
//             </div>

//             <div class="section">
//               نوع الدفع: ${isCash ? "نقدي" : "آجل"}<br/>
//               <div>العميل: <span class="badge">${customerName ?? "بدون"}</span></div>
//             </div>

//             <!-- TABLE -->
//             <table>
//               <thead>
//                 <tr>
//                   <th>م</th>
//                   <th>المنتج</th>
//                   <th>المستودع</th>
//                   <th>الكمية</th>
//                   <th>النوع</th>
//                   <th>السعر</th>
//                   <th>الإجمالي</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 ${items
//                   .map(
//                     (item, index) => `
//                     <tr>
//                       <td>${index + 1}</td>
//                       <td>${item.name}</td>
//                       <td>${item.warehousename}</td>
//                       <td>${item.selectedQty}</td>
//                       <td>${unitToArabic(item.sellingUnit)}</td>
//                       <td>${getItemPrice(item)}</td>
//                       <td>${(getItemPrice(item) * item.selectedQty).toFixed(2)}</td>
//                     </tr>
//                   `,
//                   )
//                   .join("")}
//               </tbody>
//             </table>

//             <!-- TOTALS -->
//             <div class="section">
//               <div class="flex justify-between">
//                 <div>
//                   <div class="flex gap-4 text-sm my-1 pl">
//                     <span class="totals-label">الخصم:</span>
//                     <span class="totals-value">${totals.discount.toFixed(2)} ﷼</span>
//                   </div>
//                   <div class="flex gap-4 text-sm my-1 l">
//                     <span class="totals-label">الإجمالي:</span>
//                     <span class="totals-value">${totals.totalAfter.toFixed(2)} ﷼</span>
//                   </div>
//                   <div class="flex gap-4 text-sm my-1 pl">
//                     <span class="totals-label">المبلغ المدفوع:</span>
//                     <span class="totals-value">${receivedAmount?.toFixed(2) ?? 0} ﷼</span>
//                   </div>
//                   <div class="flex gap-4 text-sm my-1 pl> ${calculatedChange > 0 ? "green" : "grey"}">
//                     <span class="totals-label">المتبقي للعميل:</span>
//                     <span class="totals-value">${calculatedChange.toFixed(2)} ﷼</span>
//                   </div>

//                 </div>

//                 ${
//                   customerDebt && customerDebt > 0
//                     ? `
//                       <div class="flex gap-2 text-sm h">
//                         <span>ديون سابقة:</span>
//                         <span class="totals-value">${customerDebt} ﷼</span>
//                       </div>
//                     `
//                     : ""
//                 }
//               </div>
//             </div>

//             <!-- FOOTER -->
//             <!-- FOOTER -->
// <div class="section text-center text-xs">
//   <p>شكرًا لتسوقك معنا!</p>
// </div>

// <!-- CASHIER + DATE/TIME -->
// <footer class="footer">
//   <div class="footer-content">
//     <div class="cashier">
//       👨‍💼 الكاشير: ${userName ?? "غير محدد"}
//     </div>
//     <div class="datetime">
//       📅 التاريخ: ${new Date().toLocaleDateString("ar-EG")} &nbsp;&nbsp;
//       ⏰ الوقت: ${new Date().toLocaleTimeString("ar-EG", { hour12: false })}
//     </div>
//   </div>
// </footer>

//         </body>
//           <div class="footer-info">

//       </html>
//     `;

//     // ✅ Use hidden iframe for mobile/PWA-safe printing
//     const iframe = document.createElement("iframe");
//     iframe.style.position = "fixed";
//     iframe.style.right = "0";
//     iframe.style.bottom = "0";
//     iframe.style.width = "0";
//     iframe.style.height = "0";
//     iframe.style.border = "none";
//     document.body.appendChild(iframe);

//     const doc = iframe.contentWindow?.document;
//     if (!doc) return;

//     doc.open();
//     doc.write(printHTML);
//     doc.close();

//     iframe.contentWindow?.focus();
//     iframe.contentWindow?.print();

//     setTimeout(() => {
//       document.body.removeChild(iframe);
//     }, 1000);
//   };

//   return (
//     <Button
//       onClick={handlePrint}
//       className="w-40 rounded bg-green-600 px-4 py-2 text-white sm:w-2xs md:w-sm"
//     >
//       {t("print")}
//     </Button>
//   );
// };"use client";

import React, { useRef } from "react";
import { Button } from "../ui/button";
import { useReactToPrint } from "react-to-print";
export interface ReceiptItem {
  id: string;
  name: string;
  warehousename: string;
  selectedQty: number;
  sellingUnit: "unit" | "packet" | "carton";
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
export default function Receipt({
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
}: any) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Receipt-${saleNumber}`,
  });
  const unitToArabic = (sellingUnit: "unit" | "packet" | "carton") => {
    switch (sellingUnit) {
      case "unit":
        return "حبة";
      case "packet":
        return "كيس";
      case "carton":
        return "كرتون";
      default:
        return "";
    }
  };
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
  return (
    <div>
      {/* 🔹 Printable Area */}
      <div ref={printRef} className="hidden print:block">
        <div dir="rtl" style={{ fontFamily: "Arial, sans-serif" }}>
          <style>
            {`
            body {
              font-family: Arial, sans-serif;
              direction: rtl;
              background: #fff;
              color: #000;
              border: 1px solid #000;
              border-radius: 6px;
              margin: 0;
            }

            .receipt-container {
              width: 100%;
              display: flex;
              flex-direction: column;
            }

            .section { padding: 6px 8px; }
            .header { border-bottom: 1px solid black; border-radius: 6px; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .items-center { align-items: center; }
            .text-center { text-align: center; }
            .green { color: green; }
            .text-3xl { font-size: 24px; font-weight: bold; }
            .text-2xl { font-size: 20px; font-weight: bold; }

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

            .footer {
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

            .badge {
              display: inline-block;
              background: #f0f0f0;
              padding: 2px 6px;
              border-radius: 8px;
              margin-right: 4px;
            }
            `}
          </style>

          <div className="receipt-container">
            {/* HEADER */}
            <div
              className="section header flex items-center justify-between"
              dir="rtl"
            >
              {/* Company */}
              <div style={{ textAlign: "right" }}>
                <div className="green text-3xl">مؤسسة عادل الرياشي</div>
                <div className="text-2xl">للتجارة والاستيراد</div>
                <div>رقم الفاتورة: {saleNumber}</div>
              </div>

              {/* Logo */}
              <div style={{ textAlign: "center" }}>
                <img
                  src="/logo.png"
                  alt="Logo"
                  style={{ width: "90px", height: "80px" }}
                />
              </div>

              {/* Branch */}
              <div style={{ textAlign: "left" }}>
                <div>فرع سناح - أمام محطة الصيادي</div>
                <div>تلفون: 772222599</div>
              </div>
            </div>

            {/* PAYMENT INFO */}
            <div className="section">
              <div>نوع الدفع: {isCash ? "نقدي" : "آجل"}</div>
              <div>
                العميل: <span className="badge">{customerName ?? "بدون"}</span>
              </div>
            </div>

            {/* TABLE */}
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
                {items.map((item: any, i: number) => (
                  <tr key={item.id}>
                    <td>{i + 1}</td>
                    <td>{item.name}</td>
                    <td>{item.warehousename}</td>
                    <td>{item.selectedQty}</td>
                    <td>{unitToArabic(item.sellingUnit)}</td>
                    <td>{getItemPrice(item)}</td>
                    <td>
                      {(getItemPrice(item) * item.selectedQty).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* TOTALS */}
            <div className="section">
              <div>الخصم: {totals.discount.toFixed(2)} ﷼</div>
              <div>الإجمالي: {totals.totalAfter.toFixed(2)} ﷼</div>
              <div>المبلغ المدفوع: {receivedAmount?.toFixed(2) ?? 0} ﷼</div>
              <div>المتبقي للعميل: {calculatedChange.toFixed(2)} ﷼</div>
              {customerDebt && customerDebt > 0 && (
                <div>ديون سابقة: {customerDebt} ﷼</div>
              )}
            </div>

            {/* FOOTER */}
            <div className="section text-center" style={{ fontSize: "12px" }}>
              <p>شكرًا لتسوقك معنا!</p>
            </div>

            <footer className="footer">
              <div>👨‍💼 الكاشير: {userName ?? "غير محدد"}</div>
              <div>
                📅 {new Date().toLocaleDateString("ar-EG")} &nbsp;&nbsp; ⏰{" "}
                {new Date().toLocaleTimeString("ar-EG", { hour12: false })}
              </div>
            </footer>
          </div>
        </div>
      </div>

      {/* 🔹 Print Button */}
      <Button
        onClick={handlePrint}
        className="w-40 rounded bg-green-600 px-4 py-2 text-white sm:w-2xs md:w-sm"
      >
        {t("print")}
      </Button>
    </div>
  );
}
