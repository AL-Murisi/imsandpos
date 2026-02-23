"use client";

import dynamic from "next/dynamic";

const CustomerStatement = dynamic(() => import("./ccustomerStatment"), {
  ssr: false,
  //   loading: () => <TableSkeleton />,
});
interface CustomerStatement {
  customer: {
    id: string;
    name: string;

    email: string | null;
    address: string | null;
    city: string | null;
    balance: any | null;
    phoneNumber: string | null;
    outstandingBalance: any;
  } | null;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  transactions: {
    date: Date | null;
    debit: number;
    credit: number;
    balance: number;
    description: string | null;
    docNo: string;
    typeName: string;
  }[];
  period: {
    from: string;
    to: string;
  };
}
export default function ClientWarper({
  customers,
  fiscalYear,
}: {
  customers: CustomerStatement | undefined;
  fiscalYear: any;
}) {
  return <CustomerStatement customers={customers} fiscalYear={fiscalYear} />;
}
