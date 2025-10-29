"use client";

import SearchInput from "@/components/common/searchtest";
import { useTablePrams } from "@/hooks/useTableParams";
import { SortingState } from "@tanstack/react-table";
import { debtSaleColumns } from "./columns";
import { ExportDebtSalesButton } from "@/components/ExportDebtSalesButton";
import dynamic from "next/dynamic";
import TableSkeleton from "@/components/common/TableSkeleton";
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
  from: string;
  to: string;
  usersquery: string;
  pagesize: number;
  limit: number;
};

export default function DebtSells({
  data,
  total,
  formData,
  from,
  to,
  pagesize,
  limit,
  usersquery,
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
    <div className="rounded-2xl p-2 lg:col-span-1" dir="rtl">
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
        <DataTable
          search={
            <div className="flex flex-col gap-3 md:flex-row">
              <Calendar22 />
              <SearchInput placeholder={"customer بحث "} paramKey="users" />
              <ExportDebtSalesButton
                from={from}
                to={to}
                usersquery={usersquery}
                pagesize={pagesize}
                limit={limit}
              />
            </div>
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
          highet="h-[70vh]"
          pagination={pagination}
          totalCount={data.length}
        />
      </>
    </div>
  );
}
