import dynamic from "next/dynamic";
import TableSkeleton from "@/components/common/TableSkeleton";
import PurchasesTable from "../_components/PurchasesTable";
type ProductClientProps = {
  data: any[];
  total: number;
};

function Table({ data, total }: ProductClientProps) {
  return <PurchasesTable data={data} total={total} />;
}

export default Table;
