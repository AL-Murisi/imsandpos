"use client";

import { useState } from "react";
import { useCompany } from "@/hooks/useCompany";
import { Calendar22 } from "@/components/common/DatePicker";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import SupplierStatementPrint from "./SupplierStatementPrint";
import { Card } from "@/components/ui/card";
import { Decimal } from "@prisma/client/runtime/library";

interface BankStatement {
  bank: {
    id: string;
    name: string;
    accountNumber: string | null;
    account: { opening_balance: Decimal | null };
  } | null;

  openingBalance: number;
  totalDebit: number; // سحوبات
  totalCredit: number; // إيداعات
  closingBalance: number;

  transactions: {
    date: string;
    typeName: string;
    docNo?: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
  }[];

  period: {
    from: string;
    to: string;
  };
}

export default function BankStatement({
  banks,
}: {
  banks: BankStatement | undefined;
}) {
  const [loading, setLoading] = useState(false);
  const { company } = useCompany();

  if (!company) {
    return <div>Loading...</div>;
  }

  return (
    <Card className="@container/card border-transparent bg-transparent px-2">
      {/* Header */}

      {/* Statement Display */}
      {banks && (
        <div className="bg-accent flex w-full flex-col rounded-lg p-6 shadow">
          <h1 className="text-3xl font-bold">كشف حساب مورد</h1>
          <div className="grid grid-cols-1 justify-center gap-3 md:grid-cols-1 lg:grid-cols-2 print:hidden">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-1 lg:grid-cols-2">
              <Calendar22 />
              <SupplierStatementPrint banks={banks} />
            </div>

            <div className="inline-block rounded px-6 py-3">
              <strong className="text-lg">الرصيد الحالي: </strong>
              <span className="text-2xl font-bold text-red-600">
                {banks.closingBalance.toFixed(2)} ر.ي
              </span>
            </div>
          </div>
          {/* Supplier Information */}
          <div className="mb-6 rounded p-4">
            <div className="grid grid-cols-2 gap-4">
              <h1 className="text-3xl font-bold">كشف حساب بنك</h1>
              <strong>اسم البنك:</strong> {banks.bank?.name}
              <strong>رقم الحساب:</strong> {banks.bank?.accountNumber}
              {/* <strong>العملة:</strong> {banks.bank?.currency} */}
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
                  <th className="border p-2">رقم المستند</th>
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
                    {banks.openingBalance.toFixed(2)}
                  </td>
                  <td className="border p-2 text-center">0.00</td>
                  <td className="border p-2 text-center">
                    <strong>{banks.openingBalance.toFixed(2)}</strong>
                  </td>
                </tr>

                {/* Transactions */}
                {banks.transactions.map((trans, idx) => (
                  <tr key={idx}>
                    <td className="border p-2">
                      {new Date(trans.date).toLocaleDateString("ar-EG")}
                    </td>
                    <td className="border p-2">{trans.typeName ?? ""}</td>
                    <td className="border p-2">{trans.docNo ?? ""}</td>
                    <td className="border p-2">{trans.description}</td>
                    <td className="border p-2 text-center">
                      {trans.debit > 0 ? trans.debit.toFixed(2) : "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {trans.credit > 0 ? trans.credit.toFixed(2) : "-"}
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
                    {banks.totalDebit.toFixed(2)}
                  </td>
                  <td className="border p-2 text-center">
                    {banks.totalCredit.toFixed(2)}
                  </td>
                  <td className="border p-2 text-center">
                    {banks.closingBalance.toFixed(2)}
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
