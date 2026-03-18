"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/hooks/useCompany";

type CartItem = {
  id: string;
  name: string;
  warehousename?: string;
  warehouseName?: string;
  selectedQty: number;
  sellingUnit?: string;
  selectedUnitName?: string;
  sku?: string;
};

type DisbursementGroup = {
  warehouseName: string;
  items: {
    name: string;
    sku?: string;
    quantity: number;
    unit?: string;
  }[];
};

function buildDisbursementHtml(
  company: {
    name: string;
    address?: string | null;
    city?: string | null;
    phone?: string | null;
    logoUrl?: string | null;
  },
  groups: DisbursementGroup[],
  meta: {
    saleNumber?: string;
    createdAt?: Date;
    cashierName?: string;
  },
) {
  const headerBlock = `
    <div class="header">
      <div>
        <h1>${company.name}</h1>
        <div>أمر صرف مخزون</div>
        <div>رقم البيع: ${meta.saleNumber ?? "-"}</div>
      </div>
      <img src="${company.logoUrl ?? ""}" style="width:90px;height:80px"/>
      <div>
        <div>${company.address ?? ""}</div>
        <div>${company.city ?? ""}</div>
        <div dir="ltr">${company.phone ?? ""}</div>
      </div>
    </div>
    <hr/>
    <div class="meta">
      <div><strong>التاريخ:</strong> ${
        meta.createdAt ? meta.createdAt.toLocaleDateString("ar-EG") : "-"
      }</div>
      <div><strong>الكاشير:</strong> ${meta.cashierName ?? "-"}</div>
    </div>
  `;

  const pages = groups
    .map((group, index) => {
      const rows = group.items
        .map(
          (item, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${item.name}</td>
            <td>${item.sku ?? "-"}</td>
            <td>${item.quantity}</td>
            <td>${item.unit ?? "-"}</td>
          </tr>
        `,
        )
        .join("");

      return `
        <div class="receipt ${index < groups.length - 1 ? "page" : ""}">
          ${headerBlock}
          <div class="warehouse">المستودع: ${group.warehouseName}</div>
          <table>
            <thead>
              <tr>
                <th>م</th>
                <th>الصنف</th>
                <th>SKU</th>
                <th>الكمية</th>
                <th>الوحدة</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <footer>
            <div>تم الإنشاء بواسطة النظام</div>
            <div>${new Date().toLocaleDateString("ar-EG")} ${new Date().toLocaleTimeString("ar-EG")}</div>
          </footer>
        </div>
      `;
    })
    .join("");

  return `
<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<title>أمر صرف مخزون</title>
<style>
  @page { margin: 6mm; size: A4; }
  body { font-family: Arial, sans-serif; background:#fff; margin:0; }
  .receipt { border:1px solid #000; border-radius:6px; padding:15px; margin-bottom:12px; }
  .page { page-break-after: always; }
  .header { display:flex; justify-content:space-between; align-items:center; }
  .header h1 { color:#0b5; margin:0; }
  .meta { margin: 8px 0; display:grid; gap:6px; }
  .warehouse { margin:10px 0; font-weight:bold; }
  table { width:100%; border-collapse:collapse; margin-top:10px; }
  th, td { border:1px solid #000; padding:6px; font-size:12px; text-align:center; }
  th { background:#f0f0f0; }
  footer { border-top:1px solid #000; margin-top:16px; padding-top:8px; font-size:12px; display:flex; justify-content:space-between; }
</style>
</head>
<body>
  ${pages}
</body>
</html>
`;
}

function printDisbursementOrder(html: string, onDone: () => void) {
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
      onDone();
    }, 800);
  };
}

export default function DisbursementOrderButton({
  items,
  saleNumber,
  cashierName,
}: {
  items: CartItem[];
  saleNumber?: string;
  cashierName?: string;
}) {
  const { company } = useCompany();
  const [loading, setLoading] = useState(false);

  const groups = useMemo<DisbursementGroup[]>(() => {
    const grouped: Record<string, DisbursementGroup> = {};
    for (const item of items) {
      const warehouseName =
        item.warehousename || item.warehouseName || "غير محدد";
      if (!grouped[warehouseName]) {
        grouped[warehouseName] = { warehouseName, items: [] };
      }
      grouped[warehouseName].items.push({
        name: item.name,
        sku: item.sku,
        quantity: item.selectedQty,
        unit: item.sellingUnit || item.selectedUnitName,
      });
    }
    return Object.values(grouped);
  }, [items]);

  if (!company || items.length === 0) return null;

  return (
    <Button
      onClick={() => {
        if (loading) return;
        setLoading(true);
        const html = buildDisbursementHtml(
          {
            name: company.name || "",
            address: company.address || "",
            city: company.city || "",
            phone: company.phone || "",
            logoUrl: company.logoUrl || "",
          },
          groups,
          {
            saleNumber,
            createdAt: new Date(),
            cashierName,
          },
        );
        printDisbursementOrder(html, () => setLoading(false));
      }}
      className="flex-1 rounded-md bg-emerald-600 py-3 text-white shadow-md hover:bg-emerald-700"
      disabled={loading}
    >
      {loading ? "جارٍ الطباعة..." : "طباعة أمر صرف"}
    </Button>
  );
}
