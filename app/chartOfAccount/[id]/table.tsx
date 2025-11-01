"use client";

import SearchInput from "@/components/common/searchtest";
import { SelectField } from "@/components/common/selection";
import TableSkeleton from "@/components/common/TableSkeleton";
import { Button } from "@/components/ui/button";
import { useTablePrams } from "@/hooks/useTableParams";
import { Download } from "lucide-react";
import dynamic from "next/dynamic";
import { use } from "react";
import { columns } from "./columns";

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
  const filterOptions = [
    { id: "all", name: "جميع الأنواع" },
    { id: "automated", name: "تلقائي" },
    { id: "manual", name: "يدوي" },
  ];
  return (
    <div className="rounded-2xl p-2" dir="rtl">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">قيود اليومية</h1>
          <p className="mt-1 text-sm">سجل القيود المحاسبية اليومية</p>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        search={
          <div className="flex flex-col gap-3 md:flex-row">
            <Calendar22 />

            <SearchInput
              placeholder="بحث في القيود (رقم، وصف...)"
              paramKey="search"
            />

            <SelectField
              options={filterOptions}
              paramKey="entryType"
              placeholder="نوع القيد"
            />
            <SelectField
              options={optines}
              paramKey="accountType"
              placeholder="نوع الحساب"
            />

            <Button variant="outline" onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              تصدير
            </Button>
          </div>
        }
        data={data}
        columns={columns}
        initialPageSize={pagination.pageSize}
        pageCount={Math.ceil(data.length / pagination.pageSize)}
        pageActiom={setPagination}
        onSortingChange={setSorting}
        onGlobalFilterChange={setGlobalFilter}
        globalFilter={globalFilter}
        sorting={[]}
        highet="h-[69vh]"
        pagination={pagination}
        totalCount={data.length}
      />
    </div>
  );
}
