"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Power, Trash2 } from "lucide-react";

import {
  deleteAccount,
  toggleAccountStatus,
} from "@/app/actions/chartOfaccounts";
import Dailogreuse from "@/components/common/dailogreuse";
import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import { toast } from "sonner";
const AccountFormDialog = dynamic(() => import("./AccountFormDialog"), {
  ssr: false,
});
const AccountDetailsDialog = dynamic(() => import("./AccountDetailsDialog"), {
  ssr: false,
});
interface AccountData {
  id: string;
  account_code: string;
  account_name_en: string;
  account_name_ar: string | null;
  account_type: string;
  account_category: string;
  balance: number;
  level: number;
  is_active: boolean;
  is_system: boolean;
  parent_id: string | null;
  hasChildren?: boolean;
}

type SortableHeaderProps = {
  column: any;
  label: string;
};

const SortableHeader: React.FC<SortableHeaderProps> = ({ column, label }) => {
  const isSorted = column.getIsSorted();
  const SortingIcon =
    isSorted === "asc"
      ? ArrowUp
      : isSorted === "desc"
        ? ArrowDown
        : ArrowUpDown;

  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(isSorted !== "asc")}
    >
      {label}
      <SortingIcon className="ml-2 h-4 w-4" />
    </Button>
  );
};

export const accountColumns: ColumnDef<any>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="تحديد الكل"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="تحديد الصف"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "index",
    header: "#",
    cell: ({ row }) => row.index + 1,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "account_code",
    header: ({ column }) => (
      <SortableHeader column={column} label="رمز الحساب" />
    ),
    cell: ({ row }) => (
      <span className="font-mono font-semibold">
        {row.getValue("account_code")}
      </span>
    ),
  },
  {
    accessorKey: "account_name_ar",
    header: ({ column }) => (
      <SortableHeader column={column} label="اسم الحساب" />
    ),
    cell: ({ row }) => {
      const nameAr = row.getValue("account_name_ar") as string | null;
      const nameEn = row.original.account_name_en;
      const isSystem = row.original.is_system;

      return (
        <div className="flex items-center gap-2">
          <span className="font-medium">{nameAr || nameEn}</span>
          {isSystem && (
            <Badge className="bg-blue-100 text-lg text-blue-800">نظام</Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "account_type",
    header: ({ column }) => <SortableHeader column={column} label="النوع" />,
    cell: ({ row }) => {
      const type = row.getValue("account_type") as string;
      const typeMap: Record<string, string> = {
        ASSET: "أصول",
        LIABILITY: "خصوم",
        EQUITY: "حقوق ملكية",
        REVENUE: "إيرادات",
        EXPENSE: "مصروفات",
        COST_OF_GOODS: "تكلفة البضاعة",
      };
      return <span className="text-lg">{typeMap[type] || type}</span>;
    },
  },
  {
    accessorKey: "account_category",
    header: ({ column }) => <SortableHeader column={column} label="الفئة" />,
    cell: ({ row }) => {
      const category = row.getValue("account_category") as string;
      const categoryMap: Record<string, string> = {
        CASH_AND_BANK: "نقد وبنوك",
        ACCOUNTS_RECEIVABLE: "ذمم مدينة",
        INVENTORY: "مخزون",
        FIXED_ASSETS: "أصول ثابتة",
        ACCOUNTS_PAYABLE: "ذمم دائنة",
        SALES_TAX_PAYABLE: "ضريبة مبيعات",
        OWNER_EQUITY: "رأس المال",
        RETAINED_EARNINGS: "أرباح محتجزة",
        SALES_REVENUE: "إيرادات مبيعات",
        COST_OF_GOODS_SOLD: "تكلفة البضاعة المباعة",
        OPERATING_EXPENSES: "مصاريف تشغيلية",
      };
      return (
        <span className="text-lg">
          {categoryMap[category] || category.replace(/_/g, " ")}
        </span>
      );
    },
  },
  {
    accessorKey: "balance",
    header: ({ column }) => <SortableHeader column={column} label="الرصيد" />,
    cell: ({ row }) => {
      const balance = row.getValue("balance") as number;
      const color =
        balance > 0
          ? "text-green-600"
          : balance < 0
            ? "text-red-600"
            : "text-gray-600";

      return (
        <div className={`font-mono text-lg font-semibold ${color}`}>
          {new Intl.NumberFormat("ar-YE", {
            style: "currency",
            currency: "YER",
            numberingSystem: "latn",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(balance)}
        </div>
      );
    },
  },
  {
    accessorKey: "level",
    header: ({ column }) => <SortableHeader column={column} label="المستوى" />,
    cell: ({ row }) => {
      const level = row.getValue("level") as number;
      return <Badge variant="outline">{level}</Badge>;
    },
  },
  {
    accessorKey: "is_active",
    header: ({ column }) => <SortableHeader column={column} label="الحالة" />,
    cell: ({ row }) => {
      const isActive = row.getValue("is_active") as boolean;
      return (
        <Badge
          className={
            isActive
              ? "bg-green-100 text-lg text-green-800"
              : "bg-gray-100 text-lg text-gray-800"
          }
        >
          {isActive ? "نشط" : "غير نشط"}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    header: "الإجراءات",
    cell: ({ row }) => {
      const account = row.original;
      const [confirmOpen, setConfirmOpen] = useState(false);
      const [isPending, startTransition] = useTransition();
      const handleDelete = () => {
        startTransition(async () => {
          const result = await deleteAccount(account.id);

          if (result.success) {
            toast(
              `تم بنجاح ✅
           ${result.message}تم حذف الحساب بنجاح.,
         `,
            );
          } else {
            toast(
              `  حدث خطأ ⚠️
          ${result.error} فشل في حذف الحساب
          `,
            );
          }
        });
      };
      return (
        <div className="flex gap-2">
          <AccountDetailsDialog account={account} />

          {!account.is_system && (
            <>
              <AccountFormDialog mode="edit" account={account} />

              <Dailogreuse
                open={confirmOpen}
                setOpen={setConfirmOpen}
                btnLabl={
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    className="h-8 w-8 p-0 text-red-600 hover:bg-red-100"
                    onClick={() => setConfirmOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                }
                titel="تأكيد الحذف"
                description=" هل أنت متأكد من حذف هذا الحساب؟ هذه العملية لا يمكن التراجع عنها."
                style={undefined}
              >
                {" "}
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setConfirmOpen(false)}
                  >
                    إلغاء
                  </Button>
                  <Button variant="destructive" onClick={handleDelete}>
                    موافق، احذف
                  </Button>
                </div>
              </Dailogreuse>
              {/* <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-600 hover:bg-red-100"
                onClick={() => {
                  // Delete functionality
                  console.log("Delete account:", account.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button> */}
            </>
          )}

          <Button
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 ${
              account.is_active
                ? "text-green-600 hover:bg-green-100"
                : "text-yellow-600 hover:bg-yellow-100"
            }`}
            onClick={() => {
              // Toggle status functionality
              toggleAccountStatus(account.id);
            }}
          >
            <Power className="h-4 w-4" />
          </Button>
        </div>
      );
    },
  },
];
