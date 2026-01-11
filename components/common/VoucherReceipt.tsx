"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Clock, Printer } from "lucide-react";
import { useFormatter } from "@/hooks/usePrice";

export interface VoucherProps {
  voucherNumber: string;
  voucherType: "صرف" | "قبض";
  amount: number;
  personName: string; // المورد أو العميل
  description: string;
  paymentMethod: string;
  userName?: string;
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
  company,
}) => {
  const { formatCurrency } = useFormatter();
  const [loading, setLoading] = useState(false);

  const isPayment = voucherType === "صرف";
  const color = isPayment ? "#e11d48" : "#16a34a"; // أحمر للصرف وأخضر للقبض

  const handlePrint = () => {
    if ((window as any).__printing) return;
    (window as any).__printing = true;

    const html = `
<!doctype html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="utf-8"/>
    <title>سند ${voucherType}</title>
    <style>
        @page { margin: 10mm; size: A5 landscape; }
        body { font-family: 'Arial', sans-serif; direction: rtl; margin: 0; padding: 0; background: #fff; }
        .voucher-container { border: 4px double #000; padding: 10px; position: relative; min-height: 90vh; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
        .voucher-title { border: 2px solid #000; padding: 5px 20px; font-size: 20px; font-weight: bold; background: #f0f0f0; }
        .info-section { margin-top: 20px; font-size: 16px; line-height: 2; }
        .info-row { display: flex; border-bottom: 1px dotted #ccc; margin-bottom: 10px; }
        .label { font-weight: bold; min-width: 120px; }
        .amount-box { border: 2px solid #000; padding: 10px; font-size: 22px; font-weight: bold; display: inline-block; background: #f9f9f9; margin-top: 10px; }
        .signatures { display: flex; justify-content: space-between; margin-top: 50px; font-weight: bold; }
        footer { margin-top: 30px; font-size: 12px; display: flex; justify-content: space-between; border-top: 1px solid #eee; padding-top: 5px; }
    </style>
</head>
<body>
    <div class="voucher-container">
        <div class="header">
            <div>
                <h2 style="margin:0">${company.name}</h2>
                <div style="font-size:12px">${company.address || ""} - ${company.city || ""}</div>
                <div style="font-size:12px" dir="ltr">${company.phone || ""}</div>
            </div>
            <div class="voucher-title" style="color: ${color}">سند ${voucherType}</div>
            <div style="text-align: left;">
                <img src="${company.logoUrl || ""}" style="width:80px; height:80px; object-fit:contain;"/>
                <div style="margin-top:5px">No: <strong>${voucherNumber}</strong></div>
            </div>
        </div>

        <div class="info-section">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div class="amount-box">المبلغ: ${formatCurrency(amount)}</div>
                <div>التاريخ: ${new Date().toLocaleDateString("ar-EG")}</div>
            </div>

            <div class="info-row">
                <span class="label">${isPayment ? "إلى السيد/ة:" : "من السيد/ة:"}</span>
                <span>${personName}</span>
            </div>

            <div class="info-row">
                <span class="label">وذلك مقابل:</span>
                <span>${description}</span>
            </div>

            <div class="info-row">
                <span class="label">طريقة الدفع:</span>
                <span>${paymentMethod}</span>
            </div>
        </div>

        <div class="signatures">
            <div>توقيع المستلم: .....................</div>
            <div>توقيع أمين الصندوق: .....................</div>
        </div>

        <footer>
            <div>المستخدم: ${userName || "النظام"}</div>
            <div>طبع في: ${new Date().toLocaleString("ar-EG")}</div>
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
      variant="outline"
      className="flex gap-2"
    >
      {loading ? (
        <Clock className="h-4 w-4 animate-spin" />
      ) : (
        <Printer className="h-4 w-4" />
      )}
      طباعة سند {voucherType}
    </Button>
  );
};
