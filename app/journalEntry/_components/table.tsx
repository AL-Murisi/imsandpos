"use client";

import SearchInput from "@/components/common/searchtest";
import { SelectField } from "@/components/common/selection";
import TableSkeleton from "@/components/common/TableSkeleton";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTablePrams } from "@/hooks/useTableParams";
import { Download } from "lucide-react";
import dynamic from "next/dynamic";
import { use, useState } from "react";
import { journalEntryColumns } from "./columns";
import { BulkPostButton } from "./selection";
import { useFormatter } from "@/hooks/usePrice";
import DashboardTabs from "@/components/common/Tabs";
import FiscalYearManager from "./FiscalYearManager";

const Calendar22 = dynamic(
  () => import("@/components/common/DatePicker").then((m) => m.Calendar22),
  {
    ssr: false,
  },
);

const DataTable = dynamic(
  () => import("@/components/common/test").then((m) => m.DataTable),
  {
    ssr: false,
    loading: () => <TableSkeleton />,
  },
);

type JournalEntriesClientProps = {
  dataj: Promise<any[]>;
  fiscalYears: Promise<any[] | undefined>;
  acounts: Promise<{ id: string; name: string }[]>;
};

export default function JournalEntriesTable({
  dataj,
  fiscalYears,
  acounts,
}: JournalEntriesClientProps) {
  const {
    pagination,
    sorting,
    globalFilter,
    setPagination,
    setSorting,
    setGlobalFilter,
    setParam,
  } = useTablePrams();

  const handleExport = () => {
    console.log("Exporting journal entries...");
  };
  const data = use(dataj);
  const acount = use(acounts);
  const fiscalYear = use(fiscalYears);
  // Calculate totals
  const totalDebits = data.reduce(
    (sum, entry) => sum + Number(entry.debit || 0),
    0,
  );
  const totalCredits = data.reduce(
    (sum, entry) => sum + Number(entry.credit || 0),
    0,
  );
  // const filterOptions = [
  //   { id: "all", name: "جميع الأنواع" },
  //   { id: "automated", name: "تلقائي" },
  //   { id: "manual", name: "يدوي" },
  // ];
  if (!fiscalYear) return undefined;
  const total = data.find((t) => t.total ?? 0);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;
  const optines = [
    { id: "false", name: "قيد الإنشاء" },
    { id: "true", name: "مرحّل" },
  ];
  const { formatCurrency } = useFormatter();
  return (
    <div className="" dir="rtl">
      <ScrollArea className="h-[95vh] p-4" dir="rtl">
        <>
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
          </div>
          <DashboardTabs
            defaultTab="journalEntry"
            loader={<TableSkeleton />}
            tabs={[
              {
                value: "journalEntry",
                label: "قيود",
                content: (
                  <div className="bg-accent rounded-2xl p-2 shadow-xl/20 shadow-gray-900">
                    {/* Data Table */}
                    <DataTable
                      search={
                        <div className="flex flex-col gap-3 rounded-2xl md:flex-row">
                          {" "}
                          <BulkPostButton
                            selectedEntries={selectedRows.map((row) => ({
                              entry_number: row.entry_number,
                            }))}
                            onSuccess={() => {}}
                          />
                          <Calendar22 />
                          <SearchInput
                            placeholder="بحث في القيود (رقم، وصف...)"
                            paramKey="search"
                          />
                          <SelectField
                            options={optines}
                            paramKey="isPosted"
                            placeholder="نوع القيد"
                          />
                          <SelectField
                            options={acount}
                            paramKey="account_id"
                            placeholder="نوع الحساب"
                          />
                          <Button
                            variant="outline"
                            onClick={handleExport}
                            className="gap-2"
                          >
                            <Download className="h-4 w-4" />
                            تصدير
                          </Button>
                        </div>
                      }
                      data={data}
                      columns={journalEntryColumns}
                      initialPageSize={pagination.pageSize}
                      pageCount={Math.ceil(total ?? 0 / pagination.pageSize)}
                      pageActiom={setPagination}
                      onSortingChange={setSorting}
                      onGlobalFilterChange={setGlobalFilter}
                      globalFilter={globalFilter}
                      sorting={sorting}
                      onRowSelectionChange={setSelectedRows}
                      highet="h-[57vh]"
                      pagination={pagination}
                      totalCount={data.length}
                    />
                  </div>
                ),
              },
              {
                value: "fiscalYear",
                label: "سنة مالية ",
                content: <FiscalYearManager fiscalYears={fiscalYear} />,
              },
            ]}
          />
        </>
      </ScrollArea>
    </div>
  );
}
