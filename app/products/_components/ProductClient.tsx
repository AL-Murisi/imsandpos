"use client";

import dynamic from "next/dynamic";
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
import { SelectField } from "@/components/common/selection";
const SearchInput = dynamic(() => import("@/components/common/searchtest"), {
  ssr: false,
});
import { useTablePrams } from "@/hooks/useTableParams";
const ProductForm = dynamic(() => import("./form"), {
  ssr: false,
});
import { createColumns } from "./column";

import { useTranslations } from "next-intl";
import TableSkeleton from "@/components/common/TableSkeleton";
import { Suspense } from "react";
const PrintProductTable = dynamic(
  () => import("@/components/printItems").then((m) => m.PrintProductTable),
  {
    ssr: false,
  },
);
const ImportProductsPage = dynamic(() => import("@/components/uploadItesm"), {
  ssr: false,
});
type ProductClientProps = {
  products: any[];
  total: number;
  formData: {
    warehouses: { id: string; name: string }[];
    categories: { id: string; name: string }[];
    brands: { id: string; name: string }[];
    suppliers: { id: string; name: string }[];
  };
};

// Loading skeleton for table

export default function ProductClient({
  products,
  total,
  formData,
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
  const t = useTranslations("productForm");
  // Memoize expensive computations

  // Show skeleton during initial load or hydration
  const tt = useTranslations("productColumns");
  const columns = createColumns(tt);
  return (
    <div
      className="bg-accent w-full rounded-2xl p-3 shadow-xl/20 shadow-gray-500 group-data-[[state=pending]]:animate-pulse"
      dir="rtl"
    >
      <div className="flex flex-wrap gap-2 md:flex-row lg:flex-row">
        <Calendar22 />
        <SearchInput placeholder={"بحث "} paramKey={"product"} />
        <SelectField
          options={formData.warehouses}
          paramKey="warehouseId"
          placeholder={tt("warehouseId")}
        />

        <SelectField
          options={formData.categories}
          paramKey="categoryId"
          placeholder={tt("categoryId")}
        />

        <SelectField
          options={formData.suppliers}
          paramKey={"supplierId"}
          placeholder={tt("supplierId")}
        />
        <ProductForm formData={formData} />
        {/* <Link href={"/inventory/products/new"}>
          <Button>{t("new")}</Button>
        </Link> */}
        {/* <CustomDialog
          trigger={}
          title="Add Product"
          description="Enter product details below."
        >
          <ProductForm />
        </CustomDialog> */}
      </div>
      <Suspense>
        <DataTable
          search={
            <>
              <ImportProductsPage /> <PrintProductTable products={products} />
            </>
          }
          data={products}
          columns={columns}
          initialPageSize={pagination.pageSize}
          pageCount={Math.ceil(total / pagination.pageSize)}
          pageActiom={setPagination}
          onSortingChange={setSorting}
          onGlobalFilterChange={setGlobalFilter}
          globalFilter={globalFilter}
          sorting={sorting}
          pagination={pagination}
          highet="h-[72vh]"
          totalCount={total}
        />
      </Suspense>
    </div>
  );
}
