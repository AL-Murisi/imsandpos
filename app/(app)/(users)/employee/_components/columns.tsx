"use client";

import { Column, ColumnDef } from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle,
  Clock,
  Power,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteEmployee, updateEmployeeStatus } from "@/lib/actions/employees";
import { useAuth } from "@/lib/context/AuthContext";
import EditEmployeeForm from "./editForm";
import EmployeeSalaryForm from "./salaryForm";
import { useRouter } from "next/navigation";
import { useState } from "react";

type SortableHeaderProps = {
  column: Column<any, unknown>;
  label: string;
};

const SortableHeader = ({ column, label }: SortableHeaderProps) => {
  const isSorted = column.getIsSorted();
  const SortingIcon =
    isSorted === "asc"
      ? ArrowUp
      : isSorted === "desc"
        ? ArrowDown
        : ArrowUpDown;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" aria-label={`Sort by ${label}`}>
          {label}
          <SortingIcon className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="bottom">
        <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
          <ArrowUp className="mr-2 h-4 w-4" />
          Asc
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
          <ArrowDown className="mr-2 h-4 w-4" />
          Desc
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const employeeColumns: ColumnDef<any>[] = [
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
    accessorKey: "employeeCode",
    header: ({ column }) => <SortableHeader column={column} label="الكود" />,
  },
  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column} label="الاسم" />,
  },
  {
    accessorKey: "email",
    header: ({ column }) => <SortableHeader column={column} label="البريد" />,
    cell: ({ row }) => row.getValue("email") || "غير محدد",
  },
  {
    accessorKey: "phone",
    header: ({ column }) => <SortableHeader column={column} label="الهاتف" />,
    cell: ({ row }) => row.getValue("phone") || "غير محدد",
  },
  {
    accessorKey: "position",
    header: ({ column }) => <SortableHeader column={column} label="الوظيفة" />,
    cell: ({ row }) => row.getValue("position") || "غير محدد",
  },
  {
    accessorKey: "department",
    header: ({ column }) => <SortableHeader column={column} label="القسم" />,
    cell: ({ row }) => row.getValue("department") || "غير محدد",
  },
  {
    accessorKey: "salary",
    header: ({ column }) => <SortableHeader column={column} label="الراتب" />,
    cell: ({ row }) => row.original.salary ?? "غير محدد",
  },
  {
    accessorKey: "balance",
    header: "رصيد العميل",
    cell: ({ row }) => {
      const balance = Number(row.original.balance);

      const isDebit = balance < 0; // customer owes company
      const isCredit = balance > 0; // company owes customer

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
          {balance}
        </span>
      );
    },
  },

  {
    id: "actions",
    header: "الإجراءات",
    enableHiding: false,
    cell: ({ row }) => {
      const router = useRouter();
      const [isLoading, setIsLoading] = useState(false);
      const employee = row.original;
      const { user } = useAuth();
      if (!user) return null;

      return (
        <div className="flex items-center justify-center gap-2">
          <EmployeeSalaryForm employee={employee} />
          <EditEmployeeForm employee={employee} />
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 ${
              employee.isActive
                ? "text-green-600 hover:bg-green-100"
                : "text-yellow-600 hover:bg-yellow-100"
            }`}
            onClick={() =>
              updateEmployeeStatus(
                employee.id,
                user.companyId,
                !employee.isActive,
              )
            }
            disabled={employee.position === "admin"}
            title={employee.isActive ? "تعطيل" : "تفعيل"}
          >
            <Power className="h-4 w-4" />
          </Button>
          <ConfirmModal
            title="حذف الموظف"
            description="هل أنت متأكد من حذف هذا الموظف؟ سيتم إزالة كافة البيانات المرتبطة به."
            action={() => deleteEmployee(employee.id, user.companyId)}
            confirmText="حذف"
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-red-600 hover:bg-red-100"
              disabled={employee.position === "admin"}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </ConfirmModal>

          <Button
            disabled={isLoading}
            onClick={() => {
              setIsLoading(true);
              router.push(`/employee/${employee.id}`);
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
