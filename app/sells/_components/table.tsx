"use client";
import { DataTable } from "@/components/common/test";

import CardContainer from "@/components/common/CardContainer";

import SearchInput from "@/components/common/searchtest";
import { useTablePrams } from "@/hooks/useTableParams";
import { SortingState } from "@tanstack/react-table";
import { debtSaleColumns } from "./columns";
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

  return (
    <div className="bg-accent rounded-2xl p-2 lg:col-span-1" dir="rtl">
      {/* <>
        <CustomDialog
          trigger={
            <Button>
              <Plus />
              add
            </Button>
          }
          title="إضافة فئة جديدة"
        >
          <Form />
        </CustomDialog>{" "}
      </> */}

      <>
        <SearchInput placeholder={"customer بحث "} paramKey="users" />

        <DataTable
          data={data}
          columns={debtSaleColumns}
          initialPageSize={pagination.pageSize}
          pageCount={Math.ceil(data.length / pagination.pageSize)}
          pageActiom={setPagination}
          onSortingChange={setSorting}
          onGlobalFilterChange={setGlobalFilter}
          globalFilter={globalFilter}
          sorting={sort}
          highet="h-[90vh]"
          pagination={pagination}
          totalCount={data.length}
        />
      </>
    </div>
  );
}
