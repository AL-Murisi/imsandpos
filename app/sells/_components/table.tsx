"use client";

import SearchInput from "@/components/common/searchtest";
import { useTablePrams } from "@/hooks/useTableParams";
import { SortingState } from "@tanstack/react-table";
import { debtSaleColumns } from "./columns";
import dynamic from "next/dynamic";
import TableSkeleton from "@/components/common/TableSkeleton";
const DataTable = dynamic(
  () => import("@/components/common/test").then((m) => m.DataTable),
  {
    ssr: false,
    loading: () => <TableSkeleton />,
  },
);
import { SelectField } from "@/components/common/selection";

type ProductClientProps = {
  data: any[];
  total: number;
  formData?: {
    warehouses: { id: string; name: string }[];
    categories: { id: string; name: string }[];
    brands: { id: string; name: string }[];
    suppliers: { id: string; name: string }[];
  };
  sort: SortingState;
};

export default function DebtSells({
  data,
  total,
  formData,
  sort,
}: ProductClientProps) {
  const {
    pagination,
    sorting,
    globalFilter,
    setPagination,
    setSorting,
    setGlobalFilter,
    warehouseId,
    supplierId,
    categoryId,
    setParam,
  } = useTablePrams();

  const filteroption = [
    { id: "sale", name: "بيع" },
    {
      id: "return",
      name: "إرجاع",
    },
  ];
  return (
    <div className="bg-accent rounded-2xl p-2 lg:col-span-1" dir="rtl">
      <DataTable
        search={
          <SelectField
            options={filteroption}
            paramKey="sale_type"
            placeholder={"نوع العملية"}
          />
        }
        data={data}
        columns={debtSaleColumns}
        initialPageSize={pagination.pageSize}
        pageCount={Math.ceil(total / pagination.pageSize)}
        pageActiom={setPagination}
        onSortingChange={setSorting}
        onGlobalFilterChange={setGlobalFilter}
        globalFilter={globalFilter}
        sorting={sort}
        highet="h-[52vh]"
        pagination={pagination}
        totalCount={data.length}
      />
    </div>
  );
}
