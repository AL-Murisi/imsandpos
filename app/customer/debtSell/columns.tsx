"use client";
import { ColumnDef, Column } from "@tanstack/react-table";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Clock,
  CheckCircle,
} from "lucide-react";

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
import { Label } from "@/components/ui/label";
import { deleteCustomer, updateCustomerStatus } from "@/app/actions/customers";
import { useAuth } from "@/lib/context/AuthContext";
import DebtReport from "@/app/debt/_components/DebtReport";

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
    accessorKey: "phoneNumber",
    header: ({ column }) => (
      <SortableHeader column={column} label="رقم الهاتف" />
    ),
    cell: ({ row }) => <div>{row.getValue("phoneNumber") || "غير محدد"}</div>,
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
    accessorKey: "outstandingBalance",
    header: " على العميل",
    cell: ({ row }) => {
      const balance = Number(row.original.outstandingBalance);

      const isDebit = balance > 0; // customer owes company
      const isCredit = balance < 0; // company owes customer

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
          {balance.toFixed(2)} مدين`
        </span>
      );
    },
  },
  {
    accessorKey: "balance",
    header: "رصيد العميل",
    cell: ({ row }) => {
      const balance = Number(row.original.balance);

      const isCredit = balance < 0; // company owes customer

      return (
        <span className={`font-bold ${"text-green-600"}`}>
          ${balance.toFixed(2)}
        </span>
      );
    },
  },
  {
    id: "actions",
    header: "الإجراءات",
    enableHiding: false,

    cell: ({ row }) => {
      const customer = row.original;
      const { user } = useAuth();
      if (!user) return;
      return (
        <>
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
              <DropdownMenuItem
                onClick={() => deleteCustomer(customer.id, user.companyId)}
              >
                حذف العميل
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DebtReport customerName={customer.name} customerID={customer.id} />
        </>
      );
    },
  },
];
