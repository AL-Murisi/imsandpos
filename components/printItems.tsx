"use client";

import React from "react";
import { Button } from "./ui/button";

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  description?: string;
  pricePerUnit?: number;
  pricePerPacket?: number;
  pricePerCarton?: number;
  wholesalePrice?: number;
  weight?: number;
}

interface PrintProductTableProps {
  products: Product[];
}

interface PurchaseItem {
  product: { name: string; sku: string };
  quantity: number;
  unitCost: number;
  totalCost: number;
}

interface Purchase {
  id: string;
  supplier?: { name: string };
  createdAt: string;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  status: string;
  purchaseItems: PurchaseItem[];
}

interface PrintPurchasesTableProps {
  purchases: Purchase[];
}

export const PrintPurchasesTable: React.FC<PrintPurchasesTableProps> = ({
  purchases,
}) => {
  const handlePrint = () => {
    const html = `
    <html dir="rtl">
      <head>
        <title>قائمة المشتريات</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            direction: rtl;
            margin: 20px;
            color: #000;
          }
          .header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }
          .company-name {
            text-align: right;
          }
          .company-name .text-3xl {
            font-size: 24px;
            font-weight: bold;
            color: green;
          }
          .company-name .text-2xl {
            font-size: 20px;
          }
          .logo img {
            width: 100px;
            height: 90px;
          }
          .branch-info {
            text-align: left;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid black;
            padding: 6px;
            text-align: center;
            font-size: 13px;
          }
          th {
            background-color: #f0f0f0;
          }
          .table-header {
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header-container">
          <div class="company-name">
            <div class="text-3xl">مؤسسة عادل الرياشي</div>
            <div class="text-2xl">للتجارة والاستيراد</div>
          </div>
          <div class="logo">
            <img src="/logo.png" alt="Logo" />
          </div>
          <div class="branch-info">
            <div>فرع سناح - أمام محطة الصيادي</div>
            <div>تلفون: 772222599</div>
            <div>التاريخ: ${new Date().toLocaleDateString("ar-EG")}</div>
            <div>الوقت: ${new Date().toLocaleTimeString("ar-EG", { hour12: false })}</div>
          </div>
        </div>

        <div class="table-header">قائمة المشتريات</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>المورد</th>
              <th>تاريخ الشراء</th>
              <th>المبلغ الإجمالي</th>
              <th>المدفوع</th>
              <th>المتبقي</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            ${purchases
              .map(
                (p, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${p.supplier?.name ?? "-"}</td>
                <td>${new Date(p.createdAt).toLocaleDateString("ar-EG")}</td>
                <td>${p.totalAmount.toFixed(2)}</td>
                <td>${p.amountPaid.toFixed(2)}</td>
                <td>${p.amountDue.toFixed(2)}</td>
                <td>${p.status}</td>
              </tr>`,
              )
              .join("")}
          </tbody>
        </table>
        <div>إجمالي المشتريات: ${purchases.length}</div>
      </body>
    </html>
  `;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  };

  return (
    <Button onClick={handlePrint} className="rounded px-4 py-2">
      طباعة المشتريات
    </Button>
  );
};
export const PrintProductTable: React.FC<PrintProductTableProps> = ({
  products,
}) => {
  const handlePrint = () => {
    const html = `
    <html>
      <head>
        <title>Product List</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            direction: rtl;
            margin: 20px;
            color: #000;
          }
          .header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }
          .company-name {
            text-align: right;
          }
          .company-name .text-3xl {
            font-size: 24px;
            font-weight: bold;
            color: green;
          }
          .company-name .text-2xl {
            font-size: 20px;
          }
          .logo img {
            width: 100px;
            height: 90px;
          }
          .branch-info {
            text-align: left;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
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
          .table-header {
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 10px;
          }
            .head{
              border-bottom: 1px solid black;
              border-radius: 6px;
            }
        </style>
      </head>
      <body>
        <div class="header-container head">
          <!-- Company Name Right -->
          <div class="company-name">
            <div class="text-3xl">مؤسسة عادل الرياشي</div>
            <div class="text-2xl">للتجارة والاستيراد</div>
          </div>

          <!-- Logo Middle -->
          <div class="logo">
            <img src="/logo.png" alt="Logo" />
          </div>

          <!-- Branch Info Left -->
          <div class="branch-info">
            <div>فرع سناح - أمام محطة الصيادي</div>
            <div>تلفون: 772222599</div>
            <div>التاريخ: ${new Date().toLocaleDateString("ar-EG")}</div>
            <div>الوقت: ${new Date().toLocaleTimeString("ar-EG", { hour12: false })}</div>
          </div>
        </div>

        <div class="table-header">قائمة المنتجات</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>الاسم</th>
              <th>SKU</th>
              <th>باركود</th>
              <th>الوصف</th>
              <th>سعر الوحدة</th>
              <th>سعر العبوة</th>
              <th>سعر الكرتون</th>
              <th>سعر الجملة</th>
              <th>الوزن</th>
            </tr>
          </thead>
          <tbody>
            ${products
              .map(
                (p, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${p.name}</td>
                  <td>${p.sku}</td>
                  <td>${p.barcode}</td>
                  <td>${p.description ?? "-"}</td>
                  <td>${p.pricePerUnit?.toFixed(2) ?? "-"}</td>
                  <td>${p.pricePerPacket?.toFixed(2) ?? "-"}</td>
                  <td>${p.pricePerCarton?.toFixed(2) ?? "-"}</td>
                  <td>${p.wholesalePrice?.toFixed(2) ?? "-"}</td>
                  <td>${p.weight?.toFixed(2) ?? "-"}</td>
                </tr>
              `,
              )
              .join("")}
          </tbody>
        </table>
        <div>إجمالي المنتجات: ${products.length}</div>
      </body>
    </html>
  `;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(html);
    doc.close();

    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();

    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  };

  return (
    <Button onClick={handlePrint} className="rounded px-4 py-2">
      طباعة المنتجات
    </Button>
  );
};

interface Expense {
  id: string;
  expenseNumber: string;
  description: string;
  category?: { name: string };
  amount: number;
  paymentMethod: string;
  expenseDate: string;
  status: string;
  notes?: string;
}

interface PrintExpenseTableProps {
  expenses: Expense[];
}

interface Payment {
  id: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  note?: string;
  supplier?: { name: string };
}

interface PrintPaymentsTableProps {
  payments: Payment[];
}

export const PrintPaymentsTable: React.FC<PrintPaymentsTableProps> = ({
  payments,
}) => {
  const handlePrint = () => {
    const html = `
    <html dir="rtl">
      <head>
        <title>قائمة الدفعات</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            direction: rtl;
            margin: 20px;
            color: #000;
          }
          .header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }
          .company-name {
            text-align: right;
          }
          .company-name .text-3xl {
            font-size: 24px;
            font-weight: bold;
            color: green;
          }
          .company-name .text-2xl {
            font-size: 20px;
          }
          .logo img {
            width: 100px;
            height: 90px;
          }
          .branch-info {
            text-align: left;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid black;
            padding: 6px;
            text-align: center;
            font-size: 13px;
          }
          th {
            background-color: #f0f0f0;
          }
          .table-header {
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header-container">
          <div class="company-name">
            <div class="text-3xl">مؤسسة عادل الرياشي</div>
            <div class="text-2xl">للتجارة والاستيراد</div>
          </div>
          <div class="logo">
            <img src="/logo.png" alt="Logo" />
          </div>
          <div class="branch-info">
            <div>فرع سناح - أمام محطة الصيادي</div>
            <div>تلفون: 772222599</div>
            <div>التاريخ: ${new Date().toLocaleDateString("ar-EG")}</div>
            <div>الوقت: ${new Date().toLocaleTimeString("ar-EG", { hour12: false })}</div>
          </div>
        </div>

        <div class="table-header">قائمة الدفعات</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>رقم الدفعة</th>
              <th>التاريخ</th>
              <th>المبلغ</th>
              <th>طريقة الدفع</th>
              <th>المورد</th>
              <th>ملاحظة</th>
            </tr>
          </thead>
          <tbody>
            ${payments
              .map(
                (p, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${p.id.slice(0, 8)}...</td>
                <td>${new Date(p.paymentDate).toLocaleDateString("ar-EG")}</td>
                <td>${p.amount.toFixed(2)}</td>
                <td>${p.paymentMethod}</td>
                <td>${p.supplier?.name ?? "-"}</td>
                <td>${p.note ?? "-"}</td>
              </tr>`,
              )
              .join("")}
          </tbody>
        </table>
        <div>إجمالي الدفعات: ${payments.length}</div>
      </body>
    </html>
  `;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  };

  return (
    <Button onClick={handlePrint} className="rounded px-4 py-2">
      طباعة الدفعات
    </Button>
  );
};
export const PrintExpenseTable: React.FC<PrintExpenseTableProps> = ({
  expenses,
}) => {
  const handlePrint = () => {
    const html = `
    <html lang="ar" dir="rtl">
      <head>
        <title>قائمة المصروفات</title>
        <style>
          body {
            font-family: "Tahoma", sans-serif;
            direction: rtl;
            margin: 20px;
            color: #000;
          }
          .header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }
          .company-name {
            text-align: right;
          }
          .company-name .text-3xl {
            font-size: 24px;
            font-weight: bold;
            color: green;
          }
          .company-name .text-2xl {
            font-size: 20px;
          }
          .logo img {
            width: 100px;
            height: 90px;
          }
          .branch-info {
            text-align: left;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }
          th, td {
            border: 1px solid black;
            padding: 6px;
            text-align: center;
            font-size: 13px;
          }
          th {
            background-color: #f0f0f0;
          }
          .table-header {
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .total {
            margin-top: 20px;
            font-size: 16px;
            font-weight: bold;
            text-align: right;
          }
          .head {
            border-bottom: 1px solid black;
            border-radius: 6px;
          }
        </style>
      </head>
      <body>
        <div class="header-container head">
          <!-- Company Name Right -->
          <div class="company-name">
            <div class="text-3xl">مؤسسة عادل الرياشي</div>
            <div class="text-2xl">للتجارة والاستيراد</div>
          </div>

          <!-- Logo Middle -->
          <div class="logo">
            <img src="/logo.png" alt="Logo" />
          </div>

          <!-- Branch Info Left -->
          <div class="branch-info">
            <div>فرع سناح - أمام محطة الصيادي</div>
            <div>تلفون: 772222599</div>
            <div>التاريخ: ${new Date().toLocaleDateString("ar-EG")}</div>
            <div>الوقت: ${new Date().toLocaleTimeString("ar-EG", { hour12: false })}</div>
          </div>
        </div>

        <div class="table-header">قائمة المصروفات</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>رقم المصروف</th>
              <th>الوصف</th>
              <th>الفئة</th>
              <th>المبلغ</th>
              <th>طريقة الدفع</th>
              <th>التاريخ</th>
              <th>الحالة</th>
              <th>ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            ${expenses
              .map(
                (e, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${e.expenseNumber}</td>
                  <td>${e.description}</td>
                  <td>${e.category?.name || "غير محدد"}</td>
                  <td>${e.amount.toFixed(2)}</td>
                  <td>${
                    {
                      cash: "نقداً",
                      bank: "تحويل بنكي",
                      card: "بطاقة",
                      check: "شيك",
                    }[e.paymentMethod] || e.paymentMethod
                  }</td>
                  <td>${new Date(e.expenseDate).toLocaleDateString("ar-EG")}</td>
                  <td>${
                    {
                      pending: "قيد الانتظار",
                      approved: "موافق عليه",
                      rejected: "مرفوض",
                      paid: "مدفوع",
                    }[e.status] || e.status
                  }</td>
                  <td>${e.notes || "-"}</td>
                </tr>
              `,
              )
              .join("")}
          </tbody>
        </table>

        <div class="total">
          إجمالي عدد المصروفات: ${expenses.length} <br>
          إجمالي المبالغ: ${expenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)} ريال
        </div>
      </body>
    </html>
    `;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(html);
    doc.close();

    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();

    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  };

  return (
    <Button onClick={handlePrint} className="rounded px-4 py-2">
      طباعة المصروفات
    </Button>
  );
};
