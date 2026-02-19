"use client";

import dynamic from "next/dynamic";
import TableSkeleton from "@/components/common/TableSkeleton";
type ProductClientProps = {
  data: any[];
  total: number;
};
const PurchasesTable = dynamic(() => import("../_components/PurchasesTable"), {
  ssr: false,
  loading: () => <TableSkeleton />,
});
function Table({ data, total }: ProductClientProps) {
  return <PurchasesTable data={data} total={total} />;
}

export default Table;
