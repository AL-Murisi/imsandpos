"use client";

import dynamic from "next/dynamic";

const SupplierStatement = dynamic(() => import("./SupplierStatement"), {
  ssr: false,
  //   loading: () => <TableSkeleton rows={20} columns={10} />,
});
interface SupplierStatement {
  supplier: {
    id: string;
    name: string;
    email: string | null;
    address: string | null;
    city: string | null;
    phoneNumber: string | null;
    totalPurchased: any;
    totalPaid: any;
    outstandingBalance: any;
  } | null;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  transactions: any[];
  period: {
    from: string;
    to: string;
  };
}
export default function ClientWarper({
  suppliers,
  fiscalYear,
}: {
  suppliers: SupplierStatement | undefined;
  fiscalYear: any;
}) {
  return <SupplierStatement suppliers={suppliers} fiscalYear={fiscalYear} />;
}
