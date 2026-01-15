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
import {
  journalEntryColumns,
  voucherColumns,
} from "../_components/columns/columns";
import { BulkPostButton } from "./selection";
import { useFormatter } from "@/hooks/usePrice";
import DashboardTabs from "@/components/common/Tabs";
import FiscalYearManager from "./FiscalYearManager";
import ManualJournalEntry from "./Manualjournal";

const Calendar22 = dynamic(
  () => import("@/components/common/DatePicker").then((m) => m.Calendar22),
  {
    ssr: false,
  },
);

const DataTable = dynamic(
  () => import("@/components/common/ReusbleTable").then((m) => m.DataTable),
  {
    ssr: false,
    loading: () => <TableSkeleton />,
  },
);

type JournalEntriesClientProps = {
  data: any | undefined;
};

export default function VouvherEntriesTable({
  data,
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
          data={data}
          columns={voucherColumns}
          initialPageSize={pagination.pageSize}
          pageCount={Math.ceil(0 / pagination.pageSize)}
          pageActiom={setPagination}
          onSortingChange={setSorting}
          onGlobalFilterChange={setGlobalFilter}
          globalFilter={globalFilter}
          sorting={sorting}
          onRowSelectionChange={setSelectedRows}
          highet="h-[80vh]"
          pagination={pagination}
          totalCount={0}
        />
      </div>
    </div>
  );
}
