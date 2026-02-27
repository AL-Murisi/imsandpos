"use client";

import TableSkeleton from "@/components/skeleton/table";
import { useTablePrams } from "@/hooks/useTableParams";
import dynamic from "next/dynamic";
import { useState } from "react";
import { voucherColumns } from "./columns/columns";

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
    loading: () => <TableSkeleton rows={20} columns={10} />,
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
        <DataTable
          search={<Calendar22 />}
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

