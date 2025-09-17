"use client";

import CustomDialog from "@/components/common/Dailog";
import { Calendar22 } from "@/components/common/DatePicker";
import { SelectField } from "@/components/common/selection";
import { DataTable } from "@/components/common/test";
import { Button } from "@/components/ui/button";
import { useTablePrams } from "@/hooks/useTableParams";

import SearchInput from "@/components/common/searchtest";
import { columns } from "./column";
import ProductForm from "./form";

import dynamic from "next/dynamic";

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

  // Memoize expensive computations

  // Show skeleton during initial load or hydration

  return (
    <div className="w-full bg-accent  rounded-2xl p-2  " dir="rtl">
      {/* <SearchInput
        placeholder={"search"}
        value={globalFilter}
        onSearchChange={(value) => setParam("search", value)}
      /> */}
      <div className="flex flex-col md:flex-row  gap-2 p-1">
        <Calendar22 />
        <SearchInput placeholder={"بحث "} paramKey={"product"} />
        <SelectField
          options={formData.warehouses}
          onValueChange={(value) => setParam("warehouseId", value)}
          value={warehouseId}
          placeholder="Warehouse"
        />
        <SelectField
          options={formData.categories}
          onValueChange={(value) => setParam("categoryId", value)}
          value={supplierId}
          placeholder="الفئة"
        />
        <SelectField
          options={formData.suppliers}
          onValueChange={(value) => setParam("supplierId", value)}
          value={supplierId}
          placeholder="Supplier"
        />
        <CustomDialog
          trigger={<Button>Add Product</Button>}
          title="Add Product"
          description="Enter product details below."
        >
          <ProductForm />
        </CustomDialog>
      </div>

      <DataTable
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
        highet="h-[75vh]"
        totalCount={total}
      />
    </div>
  );
}
