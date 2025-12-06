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
import { journalEntryColumns } from "../_components/columns/columns";
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
  data: any[];

  acount: { id: string; name: string }[];
};

export default function JournalEntriesTable({
  data,

  acount,
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

  const total = data.find((t) => t.total ?? 0);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const optines = [
    { id: "false", name: "قيد الإنشاء" },
    { id: "true", name: "مرحّل" },
  ];

  return (
    <div className="" dir="rtl">
      <div className="bg-accent rounded-2xl p-2 shadow-xl/20 shadow-gray-900">
        {/* Data Table */}
        <DataTable
          search={
            <div className="flex flex-wrap gap-2 p-1 md:flex-row lg:flex-row">
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
    </div>
  );
}
