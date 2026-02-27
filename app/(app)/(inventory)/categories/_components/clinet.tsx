"use client";

import TableSkeleton from "@/components/common/TableSkeleton";
import dynamic from "next/dynamic";
import React from "react";

const CategoryTable = dynamic(() => import("./tables"), {
  ssr: false,
  loading: () => <TableSkeleton rows={20} columns={10} />,
});
type ProductClientProps = {
  data: any[];
  total: number;
  formData: {
    warehouses: { id: string; name: string }[];
    categories: { id: string; name: string }[];
    brands: { id: string; name: string }[];
    suppliers: { id: string; name: string }[];
  };
};

export default function Clinet({ data, total, formData }: ProductClientProps) {
  return <CategoryTable data={data} total={total} formData={formData} />;
}

