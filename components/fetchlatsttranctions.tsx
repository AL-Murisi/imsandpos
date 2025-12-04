"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useFormatter } from "@/hooks/usePrice";
import { getLatestJournalEntries } from "@/lib/actions/Journal Entry";

interface Transaction {
  id: string;
  date: Date;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  account: { code: string; name: string };
}

export default function LatestTransactions({
  accountId,
}: {
  accountId: string;
}) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const { formatCurrency } = useFormatter();

  useEffect(() => {
    async function fetchEntries() {
      const data = await getLatestJournalEntries(accountId);
      setTransactions(data || []);
    }
    fetchEntries();
  }, [accountId]);

  return (
    <div>
      <h4 className="mb-4 flex items-center justify-between text-lg font-semibold">
        <span>آخر المعاملات</span>
        <Button
          variant="link"
          size="sm"
          onClick={() =>
            (window.location.href = `/chartOfAccount/${accountId}`)
          }
        >
          عرض الكل
        </Button>
      </h4>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                التاريخ
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                الوصف
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                مدين
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                دائن
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                الرصيد
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.length > 0 ? (
              transactions.map((tx) => (
                <tr key={tx.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    {new Date(tx.date).toLocaleDateString("ar-IQ")}
                  </td>
                  <td className="px-4 py-3 text-sm">{tx.description}</td>
                  <td className="px-4 py-3 font-mono text-sm text-green-600">
                    {tx.debit > 0 ? formatCurrency(tx.debit) : "-"}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-red-600">
                    {tx.credit > 0 ? formatCurrency(tx.credit) : "-"}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm font-semibold">
                    {formatCurrency(tx.balance)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">
                  لا توجد معاملات
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
