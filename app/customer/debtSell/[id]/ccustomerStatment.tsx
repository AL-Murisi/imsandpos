"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { useCompany } from "@/hooks/useCompany";
import { getCustomerStatement } from "@/app/actions/test";
import { Calendar22 } from "@/components/common/DatePicker";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import CustomerStatementPrint from "@/app/customer/debtSell/[id]/_components/CustonerStatmentprint";
import { Card } from "@/components/ui/card";
type Company =
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
interface CustomerStatement {
  customer: {
    id: string;
    name: string;

    email: string | null;
    address: string | null;
    city: string | null;
    balance: any | null;
    phoneNumber: string | null;
    outstandingBalance: any;
  } | null;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  transactions: {
    date: Date | null;
    debit: number;
    credit: number;
    balance: number;
    description: string | null;
    docNo: string;
    typeName: string;
  }[];
  period: {
    from: string;
    to: string;
  };
}

export default function CustomerStatement({
  customers,
}: {
  customers: CustomerStatement | undefined;
}) {
  // const [customers, setStatement] = useState<CustomerStatement | undefined>(
  //   undefined,
  // );
  const [loading, setLoading] = useState(false);
  // const [selectedCustomerId, setSelectedCustomerId] = useState("");
  // const [dateFrom, setDateFrom] = useState(
  //   new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0],
  // );
  // const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);
  // const { user } = useAuth();
  const { company } = useCompany();
  //   const [customers, setCustomers] = useState([]);
  if (!company) {
    return <div>Loading...</div>;
  }
  // const loadStatement = async () => {
  //   if (!selectedCustomerId) {
  //     alert("الرجاء اختيار عميل");
  //     return;
  //   }

  //   setLoading(true);
  //   try {
  //     const result = await getCustomerStatement(
  //       selectedCustomerId,
  //       user.companyId,
  //       dateFrom,
  //       dateTo,
  //     );

  //     if (result.success) {
  //       setStatement(result.data || undefined);
  //     } else {
  //       alert(result.error);
  //     }
  //   } catch (error) {
  //     console.error("Error:", error);
  //     alert("حدث خطأ أثناء جلب البيانات");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  return (
    <Card className="@container/card border-transparent bg-transparent px-2">
      {/* فورم البحث */}

      {/* عرض الكشف */}
      {customers && (
        <div className="bg-accent flex w-full flex-col rounded-lg p-6 shadow">
          <h1 className="text-3xl font-bold">كشف حساب عميل</h1>{" "}
          <div className="grid grid-cols-1 justify-center gap-3 md:grid-cols-2 print:hidden">
            {" "}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-1 lg:grid-cols-2">
              <Calendar22 />
              <CustomerStatementPrint customers={customers} />
            </div>
            <div className="inline-block rounded px-6 py-3">
              <strong className="text-lg">الرصيد الحالي: </strong>
              <span className="text-2xl font-bold text-red-600">
                {customers.closingBalance.toFixed(2)} ر.ي
              </span>
            </div>
          </div>{" "}
          {/* رأس التقرير */}
          {/* <div className="mb-6 border-b pb-4 text-center">
            <h2 className="text-2xl font-bold">{company.name}</h2>
            <p className="text-gray-600">{company.address}</p>
            <p className="text-gray-600">{company.phone}</p>
          </div> */}
          {/* معلومات العميل */}
          <div className="mb-6 rounded p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong>اسم العميل:</strong> {customers.customer?.name}
              </div>
              <div>
                <strong>الهاتف:</strong> {customers.customer?.phoneNumber ?? ""}
              </div>
              <div>
                <strong>من تاريخ:</strong>
                {customers.period.from}
              </div>
              <div>
                <strong>إلى تاريخ:</strong>
                {customers.period.to}
              </div>
            </div>
          </div>{" "}
          <ScrollArea className="h-[65vh] p-2" dir="rtl">
            {/* جدول الحركات */}
            <table className="w-full border">
              <thead className="">
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
                {/* الرصيد الافتتاحي */}
                <tr className="">
                  <td className="border p-2"></td>
                  <td className="border p-2 text-center">
                    {customers.openingBalance.toFixed(2)}
                  </td>
                  <td className="border p-2 text-center">0.00</td>
                  <td className="border p-2 text-center">
                    <strong>{customers.openingBalance.toFixed(2)}</strong>
                  </td>
                </tr>

                {/* الحركات */}
                {customers.transactions.map((trans, idx) => (
                  <tr key={idx}>
                    <td className="border p-2">
                      {trans.date
                        ? new Date(trans.date).toLocaleDateString("ar-EG")
                        : "-"}
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

                {/* الإجماليات */}
                <tr className="font-bold">
                  <td className="border p-2" colSpan={3}>
                    <strong>الإجمالي</strong>
                  </td>{" "}
                  <td className="border p-2"></td>
                  <td className="border p-2 text-center">
                    {customers.totalDebit.toFixed(2)}
                  </td>
                  <td className="border p-2 text-center">
                    {customers.totalCredit.toFixed(2)}
                  </td>
                  <td className="border p-2 text-center">
                    {customers.closingBalance.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>{" "}
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          {/* الرصيد النهائي */}
          {/* أزرار الإجراءات */}
        </div>
      )}
    </Card>
  );
}
