"use client";

import dynamic from "next/dynamic";
import CashStatement from "./cashstatemnt";

const BankStatement = dynamic(() => import("./BankStatement"), {
  ssr: false,
  //   loading: () => <TableSkeleton rows={20} columns={10} />,
});
interface BankStatement {
  bank: {
    id: string;
    name: string;
    accountNumber: string | null;
  };

  openingBalance: number;
  totalDebit: number; // سحوبات
  totalCredit: number; // إيداعات
  closingBalance: number;

  transactions: {
    date: string;
    typeName: string;
    docNo?: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
  }[];

  period: {
    from: string;
    to: string;
  };
}

export default function ClientWrapper({
  bank,
  type,
  fiscalYear,
}: {
  bank: BankStatement | undefined;
  type?: string;
  fiscalYear: any;
}) {
  return (
    <>
      {type === "CASH" ? (
        <CashStatement cashes={bank} fiscalYear={fiscalYear} />
      ) : (
        <BankStatement banks={bank} fiscalYear={fiscalYear} />
      )}
    </>
  );
}
