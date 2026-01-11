"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "../../../components/ui/button";
import { useReactToPrint } from "react-to-print";
import { useSearchParams } from "next/navigation";
import { Clock, Printer } from "lucide-react";
import { useFormatter } from "@/hooks/usePrice";
import { useAuth } from "@/lib/context/AuthContext";
import { getCompany } from "@/lib/actions/createcompnayacc";
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
type company =
  | {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      address: string | null;
      city: string | null;
      country: string | null;
      logoUrl: string | null;
    }
  | undefined;

export default function Receipt() {
  const printRef = useRef<HTMLDivElement>(null);
  const params = useSearchParams();
  const [isLoading2, setIsLoading2] = useState(false);

  // Parse the query
  const saleNumber = params.get("saleNumber") ?? "";
  const items = JSON.parse(params.get("items") ?? "[]");
  const totals = JSON.parse(params.get("totals") ?? "{}");
  const receivedAmount = parseFloat(params.get("receivedAmount") ?? "0");
  const calculatedChange = parseFloat(params.get("calculatedChange") ?? "0");
  const userName = params.get("userName") ?? "";
  const customerName = params.get("customerName") ?? "";
  const customerDebt = parseFloat(params.get("customerDebt") ?? "0");
  const isCash = params.get("isCash") === "1";
  const company = JSON.parse(params.get("company") ?? "[]");
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
  const { formatCurrency, formatPriceK, formatQty } = useFormatter();

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
    <>
      {/* 🔹 Printable Area */}
      <div ref={printRef} className="bg-white print:block">
        <div
          dir="rtl"
          style={{ fontFamily: "Arial, sans-serif" }}
          className="bg-white"
        >
          <style>
            {`
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              @page {
                margin: 8mm;
              }
            }

            body {
              font-family: Arial, sans-serif;
              direction: rtl;
              background: #fff;
              color: #000;
              margin: 0;
              padding: 0;
            }

            .receipt-container {
              width: 100%;
              max-width: 210mm;
              margin: 0 auto;
              padding: 0;
              box-sizing: border-box;
              border: 1px solid #000;
            }

            .section { 
              padding: 2mm 4mm;
              margin: 0;
            }
            
            .header { 
              border-bottom: 1px solid black;
              padding: 3mm 4mm;
              margin: 0;
            }
            
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .items-center { align-items: center; }
            .text-center { text-align: center; }
            .green { color: green; }
            .text-3xl { font-size: 20px; font-weight: bold; line-height: 1.2; }
            .text-2xl { font-size: 16px; font-weight: bold; line-height: 1.2; }

            table {
              width: 100%;
              border-collapse: collapse;
              margin: 0;
            }

            th, td {
              border: 1px solid black;
              padding: 2mm;
              text-align: center;
              font-size: 11px;
            }

            th {
              background-color: #f0f0f0;
              font-weight: bold;
            }

            .footer {
              border-top: 1px solid #000;
              padding: 2mm 4mm;
              margin: 0;
              font-size: 11px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }

            .badge {
              display: inline-block;
              background: #f0f0f0;
              padding: 1mm 2mm;
              border-radius: 3mm;
              margin-right: 2mm;
            }

            .totals-section {
              padding: 2mm 0;
              font-size: 12px;
            }

            .totals-section > div {
              margin: 1mm 0;
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
                <div className="green text-3xl">{company?.name} </div>
                <div className="text-2xl"> {company?.name}</div>
                <div>رقم الفاتورة: {saleNumber}</div>
              </div>

              {/* Logo */}
              <div style={{ textAlign: "center" }}>
                <img
                  src={company?.logoUrl ?? ""}
                  alt="Logo"
                  style={{ width: "90px", height: "80px" }}
                />
              </div>

              {/* Branch */}
              <div style={{ textAlign: "left" }}>
                <div> {company?.city}</div>
                <div> {company?.address}</div>
                <div>تلفون: {company?.phone}</div>
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
                    <td>{item.sellingUnit}</td>
                    <td>{item.pricePerUnit}</td>
                    <td>{item.selectedQty * item.pricePerUnit}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* TOTALS */}
            <div className="section">
              <div>الخصم: {formatCurrency(totals.discount.toFixed(2))} ﷼</div>
              <div>
                الإجمالي: {formatCurrency(totals.totalAfter.toFixed(2))} ﷼
              </div>
              <div>
                المبلغ المدفوع:{" "}
                {formatCurrency(Number(receivedAmount?.toFixed(2)) ?? 0)} ﷼
              </div>
              <div>
                المتبقي للعميل:{" "}
                {formatCurrency(Number(calculatedChange.toFixed(2)))} ﷼
              </div>
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
      <Button
        className="rounded bg-green-600 px-4 py-2 text-white"
        disabled={isLoading2}
        onClick={() => {
          setIsLoading2(true);
          handlePrint(); // call the function
        }}
      >
        {isLoading2 && <Clock className="h-4 w-4 animate-spin" />}
        {isLoading2 ? "جاري الطباعة..." : "طباعة"}

        <Printer color="red" />
      </Button>
      {/* 🔹 Print Button */}
    </>
  );
}
