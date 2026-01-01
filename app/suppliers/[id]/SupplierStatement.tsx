"use client";

import { useState } from "react";
import { useCompany } from "@/hooks/useCompany";
import { Calendar22 } from "@/components/common/DatePicker";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import SupplierStatementPrint from "./SupplierStatementPrint";
import { Card } from "@/components/ui/card";

interface SupplierStatement {
  supplier: {
    id: string;
    name: string;
    email: string | null;
    address: string | null;
    city: string | null;
    phoneNumber: string | null;
    totalPurchased: any;
    totalPaid: any;
    outstandingBalance: any;
  } | null;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  transactions: any[];
  period: {
    from: string;
    to: string;
  };
}

export default function SupplierStatement({
  suppliers,
}: {
  suppliers: SupplierStatement | undefined;
}) {
  const [loading, setLoading] = useState(false);
  const { company } = useCompany();

  if (!company) {
    return <div>Loading...</div>;
  }
  const getCurrencySymbol = (currency: string) => {
    switch (currency?.toLowerCase()) {
      case "usd":
        return "$";
      case "yer":
        return "ر.ي"; // Yemeni Rial in Arabic
      case "sar":
        return "ر.س"; // Saudi Riyal in Arabic
      default:
        return currency || ""; // Fallback to the original string
    }
  };
  return (
    <Card className="@container/card border-transparent bg-transparent px-2">
      {/* Header */}

      {/* Statement Display */}
      {suppliers && (
        <div className="bg-accent flex w-full flex-col rounded-lg p-6 shadow">
          <h1 className="text-3xl font-bold">كشف حساب مورد</h1>
          <div className="grid grid-cols-1 justify-center gap-3 md:grid-cols-1 lg:grid-cols-2 print:hidden">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-1 lg:grid-cols-2">
              <Calendar22 />
              <SupplierStatementPrint suppliers={suppliers} />
            </div>

            <div
              className="bg-accent/50 flex items-center gap-4 rounded px-6 py-3"
              dir="rtl"
            >
              <strong className="text-lg whitespace-nowrap">
                الرصيد الحالي:
              </strong>

              <div
                dir="ltr"
                className={`flex items-center gap-1 font-mono font-bold ${
                  suppliers.closingBalance >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                <span className="text-sm opacity-70">
                  {getCurrencySymbol(suppliers.transactions[0].Currency)}
                </span>
                <span className="text-2xl tabular-nums">
                  {suppliers.closingBalance.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          {/* Supplier Information */}
          <div className="mb-6 rounded p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong>اسم المورد:</strong> {suppliers.supplier?.name}
              </div>
              <div>
                <strong>الهاتف:</strong> {suppliers.supplier?.phoneNumber ?? ""}
              </div>
              <div>
                <strong>من تاريخ:</strong> {suppliers.period.from}
              </div>
              <div>
                <strong>إلى تاريخ:</strong> {suppliers.period.to}
              </div>
            </div>
          </div>

          <ScrollArea className="h-[65vh] p-2" dir="rtl">
            {" "}
            {/* Transactions Table */}
            <table className="w-full border">
              <thead>
                <tr>
                  <th className="border p-2">التاريخ</th>
                  <th className="border p-2">نوع السند</th>
                  {/* <th className="border p-2">رقم المستند</th> */}
                  <th className="border p-2">البيان</th>
                  <th className="border p-2">مدين</th>
                  <th className="border p-2">دائن</th>
                  <th className="border p-2">الرصيد</th>
                </tr>
              </thead>
              <tbody>
                {/* Opening Balance */}
                <tr>
                  <td className="border p-2"></td>
                  <td className="border p-2 text-center">رصيد افتتاحي</td>
                  <td className="border p-2 text-center">—</td>
                  <td className="border p-2 text-center">
                    رصيد افتتاحي للمورد
                  </td>
                  <td className="border p-2 text-center">
                    {suppliers.openingBalance.toFixed(2)}
                  </td>
                  <td className="border p-2 text-center">0.00</td>
                  <td className="border p-2 text-center">
                    <strong>{suppliers.openingBalance.toFixed(2)}</strong>
                  </td>
                </tr>

                {/* Transactions */}
                {suppliers.transactions.map((trans, idx) => (
                  <tr key={idx}>
                    <td className="border p-2">
                      {new Date(trans.date).toLocaleDateString("ar-EG")}
                    </td>
                    <td className="border p-2">{trans.typeName ?? ""}</td>
                    {/* <td className="border p-2">{trans.docNo ?? ""}</td> */}
                    <td className="border p-2">{trans.description}</td>
                    <td className="border p-2 text-center">
                      {trans.debit > 0 ? (
                        <div
                          dir="ltr"
                          className="flex items-center justify-center gap-1 font-mono text-lg font-semibold text-green-600"
                        >
                          <span className="text-sm opacity-70">
                            {getCurrencySymbol(trans.Currency)}
                          </span>
                          <span className="tabular-nums">
                            {trans.debit.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="block text-center font-mono tabular-nums opacity-50">
                          0.00
                        </span>
                      )}
                    </td>

                    <td className="border p-2 text-center">
                      {trans.credit > 0 ? (
                        <div
                          dir="ltr"
                          className="flex items-center justify-center gap-1 font-mono text-lg font-semibold text-green-600"
                        >
                          <span className="text-sm opacity-70">
                            {getCurrencySymbol(trans.Currency)}
                          </span>
                          <span className="tabular-nums">
                            {trans.credit.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="block text-center font-mono tabular-nums opacity-50">
                          0.00
                        </span>
                      )}
                    </td>
                    <td className="border p-2 text-center font-semibold">
                      {trans.balance.toFixed(2)}
                    </td>
                  </tr>
                ))}

                {/* Totals */}
                <tr className="font-bold">
                  <td className="border p-2" colSpan={3}>
                    <strong>الإجمالي</strong>
                  </td>
                  <td className="border p-2"></td>
                  <td className="border p-2 text-center">
                    {suppliers.totalDebit.toFixed(2)}
                  </td>
                  <td className="border p-2 text-center">
                    {suppliers.totalCredit.toFixed(2)}
                  </td>
                  <td className="border p-2 text-center">
                    {suppliers.closingBalance.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}
    </Card>
  );
}
