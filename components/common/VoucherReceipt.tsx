"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Clock, Printer } from "lucide-react";
import { useFormatter } from "@/hooks/usePrice";

export interface VoucherProps {
  voucherNumber: number | string; // استلام الرقم كـ Number
  voucherType: "RECEIPT" | "PAYMENT"; // التوافق مع Schema قاعدة البيانات
  amount: number;
  personName: string;
  description: string;
  paymentMethod: string;
  userName?: string;
  date?: Date | string;
  company: {
    name: string;
    address?: string | null;
    city?: string | null;
    phone?: string | null;
    logoUrl?: string | null;
  };
}

export const VoucherReceipt: React.FC<VoucherProps> = ({
  voucherNumber,
  voucherType,
  amount,
  personName,
  description,
  paymentMethod,
  userName,
  date,
  company,
}) => {
  const { formatCurrency } = useFormatter();
  const [loading, setLoading] = useState(false);

  // تحويل النوع للنص العربي
  const isPayment = voucherType === "PAYMENT";
  const voucherTypeText = isPayment ? "صرف" : "قبض";
  const color = isPayment ? "#e11d48" : "#16a34a";

  // تنسيق الرقم ليظهر 00001
  const formattedVoucherNo = String(voucherNumber).padStart(5, "0");
  const voucherFullID = `${isPayment ? "PV" : "RV"}-${formattedVoucherNo}`;

  const handlePrint = () => {
    if ((window as any).__printing) return;
    (window as any).__printing = true;

    const html = `
<!doctype html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="utf-8"/>
    <title>سند ${voucherTypeText}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
        @page { margin: 5mm; size: A5 landscape; }
        body { font-family: 'Cairo', sans-serif; direction: rtl; margin: 0; padding: 10px; background: #fff; }
        .voucher-container { border: 2px solid #000; padding: 15px; position: relative; border-radius: 8px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 10px; }
        .voucher-title-box { text-align: center; }
        .voucher-title { border: 2px solid #000; padding: 5px 25px; font-size: 18px; font-weight: bold; background: #f4f4f4; margin-bottom: 5px; }
        .info-section { margin-top: 15px; font-size: 15px; }
        .info-row { display: flex; border-bottom: 1px dotted #888; margin-bottom: 12px; padding-bottom: 4px; }
        .label { font-weight: bold; min-width: 110px; color: #444; }
        .amount-box { border: 2px solid #000; padding: 8px 15px; font-size: 20px; font-weight: bold; background: #eee; }
        .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
        .sig-item { text-align: center; width: 30%; border-top: 1px solid #000; padding-top: 5px; font-size: 13px; }
        footer { margin-top: 20px; font-size: 11px; display: flex; justify-content: space-between; color: #666; }
    </style>
</head>
<body>
    <div class="voucher-container">
        <div class="header">
            <div>
                <h2 style="margin:0; color: ${color}">${company.name}</h2>
                <div style="font-size:11px">${company.address || ""} - ${company.city || ""}</div>
                <div style="font-size:11px" dir="ltr">${company.phone || ""}</div>
            </div>
            <div class="voucher-title-box">
                <div class="voucher-title" style="color: ${color}">سند ${voucherTypeText} نقدية</div>
                <div style="font-size: 14px; font-weight: bold;">No: ${voucherFullID}</div>
            </div>
            <div style="text-align: left;">
                ${company.logoUrl ? `<img src="${company.logoUrl}" style="width:70px; height:70px; object-fit:contain;"/>` : `<div style="width:70px; height:70px; border:1px dashed #ccc"></div>`}
            </div>
        </div>

        <div class="info-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <div class="amount-box">المبلغ: ${formatCurrency(amount)}</div>
                <div style="font-weight: bold;">التاريخ: ${new Date(date || new Date()).toLocaleDateString("ar-EG")}</div>
            </div>

            <div class="info-row">
                <span class="label">${isPayment ? "يصرف للسيد/ة:" : "استلمنا من السيد/ة:"}</span>
                <span style="font-size: 17px; font-weight: bold;">${personName}</span>
            </div>

            <div class="info-row">
                <span class="label">وذلك مقابل:</span>
                <span>${description || "ــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ"}</span>
            </div>

            <div style="display: flex; justify-content: space-between;">
                <div class="info-row" style="flex: 1; border: none;">
                    <span class="label">طريقة الدفع:</span>
                    <span>${paymentMethod === "cash" ? "نقداً" : paymentMethod}</span>
                </div>
            </div>
        </div>

        <div class="signatures">
            <div class="sig-item">توقيع المستلم</div>
            <div class="sig-item">المحاسب</div>
            <div class="sig-item">يعتمد (المدير)</div>
        </div>

        <footer>
            <div>المستخدم: ${userName || "النظام"}</div>
            <div>رقم المرجع: ${voucherFullID}</div>
            <div>توقيت الطباعة: ${new Date().toLocaleString("ar-EG")}</div>
        </footer>
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
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
        (window as any).__printing = false;
        setLoading(false);
      }, 1000);
    };
  };

  return (
    <Button
      onClick={() => {
        setLoading(true);
        handlePrint();
      }}
      disabled={loading}
      variant="outline"
      size="sm"
      className="hover:bg-primary/10 flex gap-2 transition-colors"
    >
      {loading ? (
        <Clock className="h-4 w-4 animate-spin" />
      ) : (
        <Printer className="h-4 w-4" />
      )}
      طباعة {voucherTypeText}
    </Button>
  );
};
