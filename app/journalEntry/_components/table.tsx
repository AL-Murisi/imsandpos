"use client";

import SearchInput from "@/components/common/searchtest";
import { useTablePrams } from "@/hooks/useTableParams";
import { RowSelectionState, SortingState } from "@tanstack/react-table";
import { journalEntryColumns } from "./columns";
import dynamic from "next/dynamic";
import TableSkeleton from "@/components/common/TableSkeleton";
import { Button } from "@/components/ui/button";
import { Download, FileText, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { use, useState } from "react";
import { SelectField } from "@/components/common/selection";
import { BulkPostButton } from "./selection";
import { setRowSelection } from "@/lib/slices/table";
import { ScrollArea } from "@/components/ui/scroll-area";

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
};

export default function JournalEntriesTable({
  dataj,
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
  // Calculate totals
  const totalDebits = data.reduce(
    (sum, entry) => sum + Number(entry.debit || 0),
    0,
  );
  const totalCredits = data.reduce(
    (sum, entry) => sum + Number(entry.credit || 0),
    0,
  );
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;
  const optines = [
    { id: "all", name: "جميع الأنواع" },
    { id: "ASSET", name: "أصول" },
    { id: "LIABILITY", name: "خصوم" },
    { id: "EQUITY", name: "حقوق ملكية" },
    { id: "REVENUE", name: "إيرادات" },
    { id: "EXPENSE", name: "مصروفات" },
    { id: "COST_OF_GOODS", name: "تكلفة البضاعة" },
  ];

  function dispatch(arg0: void) {
    throw new Error("Function not implemented.");
  }

  return (
    <ScrollArea className="h-[95vh] p-4" dir="rtl">
      {" "}
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">قيود اليومية</h1>
          <p className="mt-1 text-lg">سجل القيود المحاسبية اليومية</p>
        </div>
      </div>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 rounded-3xl p-2 sm:grid-cols-2 md:grid-cols-4">
        <div className="rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-700 p-4">
          <p className="text-lg font-medium">إجمالي المدين</p>
          <p className="mt-1 font-mono text-2xl font-bold">
            {new Intl.NumberFormat("ar-IQ", {
              style: "currency",
              currency: "YER",
              numberingSystem: "latn",
            }).format(totalDebits)}
          </p>
        </div>

        <div className="rounded-2xl bg-gradient-to-r from-pink-700 to-pink-900 p-4 shadow-xl/20 shadow-gray-900">
          <p className="text-lg font-medium">إجمالي الدائن</p>
          <p className="mt-1 font-mono text-2xl font-bold">
            {new Intl.NumberFormat("ar-YE", {
              style: "currency",
              currency: "YER",
              numberingSystem: "latn",
            }).format(totalCredits)}
          </p>
        </div>

        <div
          className={`rounded-2xl p-4 shadow-xl/20 shadow-gray-900 ${isBalanced ? "bg-gradient-to-r from-green-500 to-cyan-700" : "bg-gradient-to-r from-red-500 to-red-700"}`}
        >
          <p className={`} text-lg font-medium`}>الفرق</p>
          <p className={`mt-1 font-mono text-2xl font-bold`}>
            {new Intl.NumberFormat("ar-YE", {
              style: "currency",
              currency: "YER",
              numberingSystem: "latn",
            }).format(Math.abs(totalDebits - totalCredits))}
          </p>
          {isBalanced && <p className="mt-1 text-xs">✓ متوازن</p>}
        </div>

        <div className="rounded-2xl bg-gradient-to-r from-yellow-500 to-yellow-700 p-4 shadow-xl/20 shadow-gray-900">
          <p className="text-lg font-medium">عدد القيود</p>
          <p className="mt-1 text-2xl font-bold">{data.length}قيد</p>
        </div>
      </div>
      <BulkPostButton
        selectedEntries={selectedRows.map((row) => ({
          entry_number: row.entry_number,
        }))}
        onSuccess={() => {}}
      />
      <div className="bg-accent rounded-2xl p-2 shadow-xl/20 shadow-gray-900">
        {/* Data Table */}
        <DataTable
          search={
            <div className="flex flex-col gap-3 rounded-2xl md:flex-row">
              <Calendar22 />

              <SearchInput
                placeholder="بحث في القيود (رقم، وصف...)"
                paramKey="search"
              />

              <Select
                value={"all"}
                onValueChange={(value) => setParam("entryType", value)}
              >
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="نوع القيد" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  <SelectItem value="automated">تلقائي</SelectItem>
                  <SelectItem value="manual">يدوي</SelectItem>
                </SelectContent>
              </Select>

              <SelectField
                options={optines}
                paramKey="accountType"
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
          pageCount={Math.ceil(data.length / pagination.pageSize)}
          pageActiom={setPagination}
          onSortingChange={setSorting}
          onGlobalFilterChange={setGlobalFilter}
          globalFilter={globalFilter}
          sorting={[]}
          onRowSelectionChange={setSelectedRows}
          highet="h-[57vh]"
          pagination={pagination}
          totalCount={data.length}
        />
      </div>
    </ScrollArea>
  );
}
