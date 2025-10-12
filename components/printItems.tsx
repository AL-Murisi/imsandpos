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
