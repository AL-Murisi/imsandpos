"use client";

import SearchInput from "@/components/common/searchtest";
import { useTablePrams } from "@/hooks/useTableParams";
import { SortingState } from "@tanstack/react-table";
import { debtSaleColumns } from "./columns";
import dynamic from "next/dynamic";
import TableSkeleton from "@/components/common/TableSkeleton";
import { DataTable } from "@/components/common/test";
import { useRouter, useSearchParams } from "next/navigation";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const saleTypeFilter = searchParams.get("sale_type") || "";

  const handleFilterChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("sale_type", value);
    else params.delete("sale_type");
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="bg-accent rounded-2xl p-2 lg:col-span-1" dir="rtl">
      <DataTable
        search={
          <>
            {" "}
            <select
              value={saleTypeFilter}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="rounded border px-2 py-1"
            >
              <option value="">الكل</option>
              <option value="sale">بيع</option>
              <option value="return">إرجاع</option>
            </select>
          </>
        }
        data={data}
        columns={debtSaleColumns}
        initialPageSize={pagination.pageSize}
        pageCount={Math.ceil(data.length / pagination.pageSize)}
        pageActiom={setPagination}
        onSortingChange={setSorting}
        onGlobalFilterChange={setGlobalFilter}
        globalFilter={globalFilter}
        sorting={sort}
        highet="h-[40vh]"
        pagination={pagination}
        totalCount={data.length}
      />
    </div>
  );
}
