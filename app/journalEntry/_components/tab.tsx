import TableSkeleton from "@/components/common/TableSkeleton";
import DashboardTabs from "@/components/common/Tabs";
import dynamic from "next/dynamic";
import React from "react";
import JournalEntriesTable from "./table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFormatter } from "@/hooks/usePrice";
// ✅ تحميل السنة المالية فقط عند الحاجة
const FiscalYearManager = dynamic(() => import("./FiscalYearManager"), {
  ssr: false,
  loading: () => <TableSkeleton />,
});
type JournalEntriesClientProps = {
  data: any[];
  fiscalYear: any[];
  acount: { id: string; name: string }[];
};
export default function Tab({
  data,
  fiscalYear,
  acount,
}: JournalEntriesClientProps) {
  const totalDebits = data.reduce(
    (sum, entry) => sum + Number(entry.debit || 0),
    0,
  );
  const totalCredits = data.reduce(
    (sum, entry) => sum + Number(entry.credit || 0),
    0,
  );
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;
  const { formatCurrency } = useFormatter();

  return (
    <ScrollArea className="h-[95vh] p-4" dir="rtl">
      <div className="grid-cols- grid gap-4 rounded-3xl p-2 sm:grid-cols-2 md:grid-cols-4">
        <div className="rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-700 p-4">
          <p className="text-lg font-medium">إجمالي المدين</p>
          <p className="mt-1 font-mono text-2xl font-bold">
            {formatCurrency(totalDebits)}
          </p>
        </div>
        <div className="rounded-2xl bg-gradient-to-r from-pink-700 to-pink-900 p-4 shadow-xl/20 shadow-gray-900">
          <p className="text-lg font-medium">إجمالي الدائن</p>
          <p className="mt-1 font-mono text-2xl font-bold">
            {formatCurrency(totalCredits)}
          </p>
        </div>
        <div
          className={`rounded-2xl p-4 shadow-xl/20 shadow-gray-900 ${isBalanced ? "bg-gradient-to-r from-green-500 to-cyan-700" : "bg-gradient-to-r from-red-500 to-red-700"}`}
        >
          <p className={`} text-lg font-medium`}>الفرق</p>
          <p className={`mt-1 font-mono text-2xl font-bold`}>
            {formatCurrency(Math.abs(totalDebits - totalCredits))}
          </p>
          {isBalanced && <p className="mt-1 text-xs">✓ متوازن</p>}
        </div>
        <div className="rounded-2xl bg-gradient-to-r from-yellow-500 to-yellow-700 p-4 shadow-xl/20 shadow-gray-900">
          <p className="text-lg font-medium">عدد القيود</p>
          <p className="mt-1 text-2xl font-bold">{data.length}قيد</p>
        </div>
        <DashboardTabs
          defaultTab="journalEntry"
          loader={<TableSkeleton />}
          tabs={[
            {
              value: "journalEntry",
              label: "قيود",
              content: <JournalEntriesTable data={data} acount={acount} />,
            },
            {
              value: "fiscalYear",
              label: "سنة مالية ",
              content: <FiscalYearManager fiscalYear={fiscalYear} />,
            },
          ]}
        />{" "}
      </div>
    </ScrollArea>
  );
}
