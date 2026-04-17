"use client";

import { Decimal } from "@prisma/client/runtime/library";
import dynamic from "next/dynamic";

const BankStatement = dynamic(() => import("./BankStatement"), {
  ssr: false,
  //   loading: () => <TableSkeleton rows={20} columns={10} />,
});
interface BankStatement {
  bank: {
    id: string;
    name: string;
    accountNumber: string | null;
    account: { opening_balance: Decimal | null };
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
  fiscalYear,
}: {
  bank: BankStatement | undefined;
  fiscalYear: any;
}) {
  return <BankStatement banks={bank} fiscalYear={fiscalYear} />;
}
