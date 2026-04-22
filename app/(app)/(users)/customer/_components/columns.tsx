"use client";
import { ColumnDef, Column } from "@tanstack/react-table";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Clock,
  CheckCircle,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

import { deleteCustomer, updateCustomerStatus } from "@/lib/actions/customers";
import { useAuth } from "@/lib/context/AuthContext";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useFormatter } from "@/hooks/usePrice";
import { ConfirmModal } from "@/components/common/confirm-modal";
const CustomerEditForm = dynamic(() => import("./editcustomer"), {
  ssr: false,
  // loading: () => <TableSkeleton rows={20} columns={10} />,
});
const DebtReport = dynamic(
  () => import("@/app/(app)/(users)/customer/_components/DebtReport"),
  {
    ssr: false,
    // loading: () => <TableSkeleton rows={20} columns={10} />,
  },
);
// 🔽 Sortable Header Component
type SortableHeaderProps = {
  column: Column<any, unknown>;
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
      onClick={() => column.toggleSorting()}
      className="flex items-center gap-1"
    >
      {label}
      <SortingIcon className="h-4 w-4" />
    </Button>
  );
};

// 🔢 Customer Columns
export const customerColumns: ColumnDef<any>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "isActive",
    header: "الحالة",
    cell: ({ row }) => {
      const status = row.original.isActive;
      return (
        <div
          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
            status
              ? "bg-green-100 text-green-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {status ? (
            <CheckCircle className="mr-1 h-4 w-4" />
          ) : (
            <Clock className="mr-1 h-4 w-4" />
          )}
          {status ? "نشط" : "غير نشط"}
        </div>
      );
    },
  },
  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column} label="الاسم" />,
    cell: ({ row }) => <div>{row.getValue("name")}</div>,
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <SortableHeader column={column} label="البريد الإلكتروني" />
    ),
    cell: ({ row }) => <div>{row.getValue("email") || "غير محدد"}</div>,
  },
  {
    accessorKey: "preferred_currency",
    header: ({ column }) => <SortableHeader column={column} label="العمله" />,
    cell: ({ row }) => (
      <div>{row.getValue("preferred_currency") || "غير محدد"}</div>
    ),
  },
  {
    accessorKey: "phoneNumber",
    header: ({ column }) => (
      <SortableHeader column={column} label="رقم الهاتف" />
    ),
    cell: ({ row }) => <div>{row.getValue("phoneNumber") || "غير محدد"}</div>,
  },

  {
    accessorKey: "creditLimit",
    header: ({ column }) => <SortableHeader column={column} label="حد دين" />,
    cell: ({ row }) => {
      const creditLimit = Number(row.original.creditLimit);
      const outstanding = Number(row.original.outstandingBalance);

      let statusColor = "";
      let label = "";

      if (outstanding >= creditLimit) {
        statusColor = "text-red-600 font-semibold"; // over limit
        label = "تجاوز الحد";
      } else if (creditLimit - outstanding <= creditLimit * 0.2) {
        statusColor = "text-yellow-600 font-semibold"; // close to limit
        label = "قرب الحد";
      } else {
        statusColor = "text-green-600 font-semibold"; // safe
        label = "ضمن الحد";
      }

      return (
        <div className={statusColor}>
          {`${outstanding} / ${creditLimit} ${label}`}
        </div>
      );
    },
  },

  {
    accessorKey: "customerType",
    header: "نوع العميل",
    cell: ({ row }) => (
      <Badge className="rounded-md bg-blue-600 text-xs text-white">
        {row.original.customerType === "individual" ? "فردي" : "تجاري"}
      </Badge>
    ),
  },
  {
    accessorKey: "balance",
    header: "رصيد العميل",
    cell: ({ row }) => {
      const balance = Number(row.original.balance);

      const isDebit = balance < 0; // customer owes company
      const isCredit = balance > 0; // company owes customer
      const { formatCurrency } = useFormatter();

      return (
        <span
          className={`font-bold ${
            isDebit
              ? "text-red-600"
              : isCredit
                ? "text-green-600"
                : "text-gray-600"
          }`}
        >
          {formatCurrency(balance)}
        </span>
      );
    },
  },
  // {
  //   accessorKey: "balance",
  //   header: "رصيد العميل",
  //   cell: ({ row }) => {
  //     const balance = Number(row.original.balance);

  //     const isCredit = balance < 0; // company owes customer
  //     const { formatCurrency } = useFormatter();
  //     return (
  //       <span className={`font-bold ${"text-green-600"}`}>
  //         {formatCurrency(balance)}
  //       </span>
  //     );
  //   },
  // },
  {
    id: "actions",
    header: "الإجراءات",
    enableHiding: false,

    cell: ({ row }) => {
      const customer = row.original;
      const { user } = useAuth();
      const router = useRouter();
      const balance = Number(row.original.balance);

      const isCredit = balance > 0 || balance < 0; // customer owes company
      const [isLoading, setIsLoading] = useState(false);

      if (!user) return;
      return (
        <div className="flex gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">فتح القائمة</span>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(customer.id)}
              >
                نسخ المعرف
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {customer.isActive ? (
                <DropdownMenuItem
                  onClick={() =>
                    updateCustomerStatus(false, customer.id, user.companyId)
                  }
                >
                  تعطيل
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() =>
                    updateCustomerStatus(true, customer.id, user.companyId)
                  }
                >
                  تفعيل
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <DebtReport
            customerName={customer.name}
            customerID={customer.id}
            outstandingBalance={customer.outstandingBalance}
          />
          <CustomerEditForm customer={customer} />
          <ConfirmModal
            title="حذف المستخدم"
            description="هل أنت متأكد من حذف هذا العميل؟ سيتم إزالة كافة البيانات المرتبطة به."
            action={() => deleteCustomer(customer.id, user.companyId)}
            confirmText="حذف"
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-red-600 hover:bg-red-100"
              disabled={isCredit}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </ConfirmModal>

          <Button
            disabled={isLoading}
            onClick={() => {
              setIsLoading(true);
              router.push(`/customer/${customer.id}`);
            }}
            className="flex items-center gap-2"
          >
            {isLoading && <Clock className="h-3 w-3 animate-spin" />}
            {isLoading ? "جاري الفتح" : "كشف حساب"}
          </Button>
        </div>
      );
    },
  },
];
