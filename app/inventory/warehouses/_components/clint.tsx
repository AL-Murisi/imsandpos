"use client";

import TableSkeleton from "@/components/common/TableSkeleton";
import dynamic from "next/dynamic";

const WarehouseTable = dynamic(() => import("./tables"), {
  ssr: false,
  loading: () => <TableSkeleton />,
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
export default function Clint({
  products,
  total,
  formData,
}: ProductClientProps) {
  return (
    <WarehouseTable
      products={products}
      total={products.length}
      formData={{
        warehouses: [],
        categories: [],
        brands: [],
        suppliers: [],
      }}
    />
  );
}
