"use client";

import { useTablePrams } from "@/hooks/useTableParams";
import { DataTable } from "@/components/common/test";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Calendar22 } from "@/components/common/DatePicker";
import { SelectField } from "@/components/common/selection";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import CustomDialog from "@/components/common/Dailog";
// import SearchInput from "@/components/common/SearchInput";
import InvonteryEditFormm from "./form";
import SearchInput from "@/components/common/searchtest";
import { inventoryColumns } from "./columns";

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

export default function ManageinvetoryClient({
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

  return (
    <div className="w-full border rounded-2xl p-2 border-amber-500 bg-accent ">
      {/* <SearchInput
        placeholder={"search"}
        value={globalFilter}
        onSearchChange={(value) => setParam("search", value)}
      /> */}
      <div className="flex flex-wrap gap-2 p-3 " dir="rtl">
        <Calendar22 />
        <SearchInput placeholder={"بحث .."} paramKey={"inventorey"} />
        <SelectField
          options={formData.warehouses}
          onValueChange={(value) => setParam("warehouseId", value)}
          value={warehouseId}
          placeholder="Warehouse"
        />
        <SelectField
          options={formData.categories}
          onValueChange={(value) => setParam("categoryId", value)}
          placeholder="الفئة"
        />
        <SelectField
          options={formData.suppliers}
          onValueChange={(value) => setParam("supplierId", value)}
          value={supplierId}
          placeholder="Supplier"
        />
        <CustomDialog
          trigger={
            <Button>
              <Plus className="mr-1" /> Add Product
            </Button>
          }
          title="Add Product"
          description="Enter product details below."
        >
          <InvonteryEditFormm inventory={undefined} />
        </CustomDialog>
      </div>

      <DataTable
        data={products}
        columns={inventoryColumns}
        initialPageSize={pagination.pageSize}
        pageCount={Math.ceil(total / pagination.pageSize)}
        pageActiom={setPagination}
        onSortingChange={setSorting}
        onGlobalFilterChange={setGlobalFilter}
        globalFilter={globalFilter}
        sorting={sorting}
        highet="h-[70vh]"
        pagination={pagination}
        totalCount={total}
      />
    </div>
  );
}
