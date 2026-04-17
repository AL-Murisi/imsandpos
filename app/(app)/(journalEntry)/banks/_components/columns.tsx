"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Power, Trash2 } from "lucide-react";
// import { toggleBankStatus, deleteBank } from "@/lib/actions/banks";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import BankFormDialog from "./form";
import { useRouter } from "next/navigation";
import { VoucherReceipt } from "@/components/common/VoucherReceipt";
export type BankRow = {
  id: string;
  name: string;
  branch?: string | null;
  accountNumber?: string | null;
  iban?: string | null;
  swiftCode?: string | null;
  currencyCode: string;
  isActive: boolean;
  account: {
    id: string;
    account_code: string;
    account_name_ar: string | null;
    account_name_en: string;
  };
};

export const bankColumns: ColumnDef<BankRow>[] = [
  {
    header: "#",
    cell: ({ row }) => row.index + 1,
  },
  {
    accessorKey: "name",
    header: "اسم البنك",
    cell: ({ row }) => <div className="font-semibold">{row.original.name}</div>,
  },
  {
    header: "الحساب المحاسبي",
    cell: ({ row }) => {
      const acc = row.original.account;
      return (
        <div className="text-sm">
          <div className="font-mono">{acc.account_code}</div>
          <div>{acc.account_name_ar || acc.account_name_en}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "accountNumber",
    header: "رقم الحساب",
  },

  {
    accessorKey: "isActive",
    header: "الحالة",
    cell: ({ row }) => (
      <Badge
        className={
          row.original.isActive
            ? "bg-green-100 text-green-800"
            : "bg-gray-100 text-gray-800"
        }
      >
        {row.original.isActive ? "نشط" : "موقوف"}
      </Badge>
    ),
  },
  {
    id: "actions",
    header: "إجراءات",
    cell: ({ row }) => {
      const bank = row.original;
      const [pending, startTransition] = useTransition();
      const [isLoading, setIsLoading] = useState(false);
      const router = useRouter();
      return (
        <div className="flex gap-2">
          <BankFormDialog bank={row.original} mode="edit" />
          <Button
            disabled={isLoading}
            onClick={() => {
              setIsLoading(true);
              router.push(`/banks/${bank.account.id}`);
            }}
          >
            {isLoading && <Clock className="h-4 w-4 animate-spin" />}
            {isLoading ? "جاري الفتح..." : "كشف حساب"}
          </Button>
          {/* <VoucherReceipt
            voucherType="صرف" // أو "قبض"
            voucherNumber="PV-1002"
            amount={5000}
            personName="شركة التوريدات الحديثة"
            description="تسوية رصيد فاتورة رقم 554"
            paymentMethod="نقداً"
            company={{ name: "Default Company", address: "Default Address" }}
            userName="أحمد علي"
          /> */}
          {/* <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              startTransition(async () => {
                const res = await toggleBankStatus(row.original.id);
                if (!res?.success) toast.error(res?.error);
              })
            }
          >
            <Power className="h-4 w-4" />
          </Button> */}

          {/* <Button
            variant="ghost"
            size="icon"
            className="text-red-600"
            onClick={() =>
              startTransition(async () => {
                const res = await deleteBank(row.original.id);
                if (res?.success) toast.success("تم حذف البنك");
                else toast.error(res?.error);
              })
            }
          >
            <Trash2 className="h-4 w-4" />
          </Button> */}
        </div>
      );
    },
  },
];
