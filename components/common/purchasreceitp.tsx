"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { useFormatter } from "@/hooks/usePrice";

export const PurchaseReceipt: React.FC<PurchaseReceiptProps> = ({
  purchaseNumber,
  items,
  totals,
  supplierName,
  userName,
  isCash,
  company,
}) => {
  const { formatCurrency } = useFormatter();
  const [loading, setLoading] = useState(false);

  const handlePrint = () => {
    if ((window as any).__printing) return;
    (window as any).__printing = true;

    const html = `
<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<title>سند شراء</title>

<style>
@page { margin: 6mm; size: A4; }

body {
  font-family: Arial, sans-serif;
  background:#fff;
  margin:0;
}

.receipt {
  border:1px solid #000;
  border-radius:6px;
  padding:15px;
}

.header {
  display:flex;
  justify-content:space-between;
  align-items:center;
}

.header h1 {
  color:green;
  margin:0;
}

table {
  width:100%;
  border-collapse:collapse;
  margin-top:10px;
}

th, td {
  border:1px solid #000;
  padding:6px;
  font-size:12px;
  text-align:center;
}

th { background:#f0f0f0; }

.totals {
  margin-top:15px;
  width:250px;
  margin-right:auto;
}

.totals div {
  display:flex;
  justify-content:space-between;
  margin:4px 0;
  font-weight:bold;
}

footer {
  border-top:1px solid #000;
  margin-top:20px;
  padding-top:10px;
  font-size:12px;
  display:flex;
  justify-content:space-between;
}
</style>
</head>

<body>
<div class="receipt">

  <!-- HEADER -->
  <div class="header">
    <div>
      <h1>${company.name}</h1>
      <div>رقم سند الشراء: ${purchaseNumber}</div>
    </div>
    <img src="${company.logoUrl ?? ""}" style="width:90px;height:80px"/>
    <div>
      <div>${company.address ?? ""}</div>
      <div>${company.city ?? ""}</div>
      <div dir="ltr">${company.phone ?? ""}</div>
    </div>
  </div>

  <hr/>

  <!-- INFO -->
  <div>
    <strong>نوع الشراء:</strong> ${isCash === "cash" ? "نقدي" : "آجل"} <br/>
    <strong>المورد:</strong> ${supplierName ?? "غير محدد"}
  </div>

  <!-- TABLE -->
  <table>
    <thead>
      <tr>
        <th>م</th>
        <th>الصنف</th>
        <th>المستودع</th>
        <th>الكمية</th>
        <th>النوع</th>
        <th>التكلفة</th>
        <th>الإجمالي</th>
      </tr>
    </thead>
    <tbody>
      ${items
        .map(
          (i, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${i.name}</td>
          <td>${i.warehousename}</td>
          <td>${i.quantity}</td>
          <td>${i.sellingUnit}</td>
          <td>${formatCurrency(i.unitCost)}</td>
          <td>${formatCurrency(i.totalCost)}</td>
        </tr>`,
        )
        .join("")}
    </tbody>
  </table>

  <!-- TOTALS -->
  <div class="totals">
    <div><span>الإجمالي:</span><span>${formatCurrency(totals.total)}</span></div>
    <div><span>المدفوع:</span><span>${formatCurrency(totals.paid)}</span></div>
    <div><span>المتبقي:</span><span>${formatCurrency(totals.due)}</span></div>
  </div>

  <footer>
    <div>👨‍💼 المستخدم: ${userName ?? "غير محدد"}</div>
    <div>📅 ${new Date().toLocaleDateString("ar-EG")} ⏰ ${new Date().toLocaleTimeString("ar-EG")}</div>
  </footer>

  <div style="text-align:center;margin-top:10px;font-weight:bold">
    شكرًا لتعاملكم معنا
  </div>

</div>
</body>
</html>
`;

    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(html);
    doc.close();

    iframe.onload = () => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
        (window as any).__printing = false;
        setLoading(false);
      }, 800);
    };
  };

  return (
    <Button
      onClick={() => {
        setLoading(true);
        handlePrint();
      }}
      disabled={loading}
      className="bg-blue-600 text-white"
    >
      {loading && <Clock className="ml-2 h-4 w-4 animate-spin" />}
      {loading ? "طباعة" : "الطباعة"}
    </Button>
  );
};
export interface PurchaseReceiptItem {
  id: string;
  name: string;
  warehousename: string;
  sellingUnit: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface PurchaseReceiptProps {
  purchaseNumber: string;
  items: PurchaseReceiptItem[];
  totals: {
    total: number;
    paid: number;
    due: number;
  };
  supplierName?: string;
  userName?: string;
  isCash: string;
  company: {
    name: string;
    address?: string | null;
    city?: string | null;
    phone?: string | null;
    logoUrl?: string | null;
  };
}
