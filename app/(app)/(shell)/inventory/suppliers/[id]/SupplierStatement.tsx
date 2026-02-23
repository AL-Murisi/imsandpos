"use client";

import { useState } from "react";
import { useCompany } from "@/hooks/useCompany";
import { Calendar22 } from "@/components/common/DatePicker";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import SupplierStatementPrint from "./SupplierStatementPrint";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

import { Card } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
interface FiscalYearType {
  start_date: Date | string;
  end_date: Date | string;
}
export default function SupplierStatement({
  suppliers,
  fiscalYear,
}: {
  suppliers: SupplierStatement | undefined;
  fiscalYear: any;
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
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleYearChange = (value: string) => {
    const [start, end] = value.split("_");

    // إنشاء كائن URLSearchParams جديد للحفاظ على أي بارامترات أخرى موجودة
    const params = new URLSearchParams(searchParams.toString());

    // تحديث التواريخ
    params.set("from", new Date(start).toISOString().split("T")[0]);
    params.set("to", new Date(end).toISOString().split("T")[0]);

    // دفع التغييرات إلى الرابط
    router.push(`${pathname}?${params.toString()}`);
  };
  return (
    <Card className="@container/card h-[85vh] border-transparent bg-transparent px-2">
      {/* Header */}

      {/* Statement Display */}
      {suppliers && (
        <div className="bg-accent flex w-full flex-col rounded-lg p-6 shadow">
          <h1 className="text-3xl font-bold">كشف حساب مورد</h1>
          <div className="grid grid-cols-1 justify-center gap-3 md:grid-cols-1 lg:grid-cols-2 print:hidden">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-1 lg:grid-cols-2">
              <div className="grid grid-rows-2 gap-2">
                <Label className="text-right">الفترة المالية</Label>
                <Select
                  onValueChange={(value: any) => {
                    setSelectedPeriod(value);
                    handleYearChange(value);
                    // logic to reload data based on this year's dates
                    // window.location.search = `?from=${start}&to=${end}`
                  }}
                >
                  <SelectTrigger className="bg-background w-full">
                    <SelectValue placeholder="اختر السنة المالية" />
                  </SelectTrigger>
                  <SelectContent>
                    {fiscalYear?.map((year: FiscalYearType, index: number) => {
                      const startDate = new Date(year.start_date);
                      const endDate = new Date(year.end_date);
                      const startYear = startDate.getFullYear();
                      const endYear = endDate.getFullYear();

                      return (
                        <SelectItem
                          key={index}
                          value={`${year.start_date}_${year.end_date}`}
                        >
                          السنة المالية{" "}
                          {startYear === endYear
                            ? startYear
                            : `${startYear} - ${endYear}`}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>{" "}
              </div>{" "}
              <div className="grid grid-rows-2 gap-2">
                {" "}
                <Label className="text-right"> طباعه الكشف</Label>
                <SupplierStatementPrint suppliers={suppliers} />
              </div>
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
                  {getCurrencySymbol(suppliers.transactions[0]?.Currency ?? "")}
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
                {suppliers.openingBalance !== 0 && (
                  <tr className="bg-gray-50 font-medium">
                    <td className="border p-2 text-center">-</td>
                    <td className="border p-2">رصيد افتتاحي</td>

                    <td className="border p-2">-</td>
                    <td className="border p-2 text-center text-red-700">
                      {suppliers.openingBalance < 0
                        ? Math.abs(suppliers.openingBalance).toFixed(2)
                        : "0.00"}
                    </td>
                    {/* خانة المدين: تظهر القيمة إذا كانت موجبة */}
                    <td className="border p-2 text-center text-green-700">
                      {suppliers.openingBalance > 0
                        ? suppliers.openingBalance.toFixed(2)
                        : "0.00"}
                    </td>

                    {/* خانة الدائن: تظهر القيمة (موجبة) إذا كان الرصيد الأصلي سالباً */}

                    {/* خانة الرصيد الإجمالي */}
                    <td className="border p-2 text-center">
                      <strong>{suppliers.openingBalance.toFixed(2)}</strong>
                    </td>
                  </tr>
                )}

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
                            {getCurrencySymbol(trans?.Currency ?? "")}
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
                            {getCurrencySymbol(trans?.Currency ?? "")}
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
                  <td className="border p-2" colSpan={2}>
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
