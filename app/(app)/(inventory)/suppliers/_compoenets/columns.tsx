"use client";

import { ColumnDef } from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle,
  Clock,
  MoreHorizontal,
  Trash,
  Trash2,
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
import { deleteCustomer } from "@/lib/actions/users";
import { useAuth } from "@/lib/context/AuthContext";
import { useState, useTransition } from "react";

import Dailogreuse from "@/components/common/dailogreuse";
import { Badge } from "@/components/ui/badge";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { EditSupplierForm } from "./editform";
import { ConfirmModal } from "@/components/common/confirm-modal";
function SupplierActions({ supplier }: { supplier: any }) {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!user) return null;

  return (
    <div className="flex gap-3">
      <Button
        onClick={() =>
          startTransition(async () => {
            router.push(`/batches?supplierId=${supplier.id}`);
          })
        }
      >
        التوريد
      </Button>

      <ConfirmModal
        title="تأكيد الحذف"
        description={`هل أنت متأكد من حذف ${supplier.name}؟ هذه العملية لا يمكن التراجع عنها.`}
        action={() =>
          startTransition(async () => {
            deleteCustomer(supplier.id, user.companyId);
          })
        }
        confirmText="حذف"
      >
        <Button
          disabled={isPending}
          className="text-red-600 hover:bg-orange-300/20 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </ConfirmModal>

      <EditSupplierForm supplier={supplier} />

      <Button
        disabled={isLoading}
        onClick={() => {
          setIsLoading(true);
          router.push(`/suppliers/${supplier.id}`);
        }}
      >
        {isLoading && <Clock className="h-4 w-4 animate-spin" />}
        {isLoading ? "جاري الفتح..." : "كشف حساب"}
      </Button>
    </div>
  );
}
const PaymentEditForm = dynamic(
  () => import("./form").then((m) => m.PaymentEditForm),
  {
    ssr: false,
  },
);
// --------------------------
// Fetch suppliers from DB
// --------------------------

// --------------------------
// Table Columns
// --------------------------

const SortableHeader = ({ column, label }: { column: any; label: string }) => {
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
      aria-label={`Sort by ${label}`}
      onClick={() => column.toggleSorting(undefined)}
    >
      {label}
      <SortingIcon className="ml-2 h-4 w-4" />
    </Button>
  );
};

export const supplierColumns: ColumnDef<any>[] = [
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
    accessorKey: "isActive",
    header: "الحالة",
    cell: ({ row }) => {
      const status = row.original.isActive;
      const color = status
        ? "bg-green-100 text-green-800"
        : "bg-yellow-100 text-yellow-800";
      const icon = status ? (
        <CheckCircle className="mr-1 h-4 w-4" />
      ) : (
        <Clock className="mr-1 h-4 w-4" />
      );
      const label = status ? "نشط" : "غير نشط";

      return (
        <div
          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${color}`}
        >
          {icon}
          {label}
        </div>
      );
    },
  },
  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column} label="الاسم" />,
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <SortableHeader column={column} label="البريد الإلكتروني" />
    ),
    cell: ({ row }) => <div>{row.getValue("email") || "-"}</div>,
  },

  {
    accessorKey: "phoneNumber",
    header: ({ column }) => (
      <SortableHeader column={column} label="رقم الهاتف" />
    ),
    cell: ({ row }) => <div>{row.getValue("phoneNumber") || "-"}</div>,
  },
  {
    id: "actions",
    enableHiding: false,

    cell: ({ row }) => <SupplierActions supplier={row.original} />, // ✅ Component, not inline hooks
  },
];

export const paymentColumns: ColumnDef<any>[] = [
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
    accessorKey: "#",
    header: "#",
    cell: ({ row }) => row.index + 1,
  },

  {
    accessorKey: "id",
    header: "رقم الدفعة",
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        {row.original.id.slice(0, 8)}...
      </span>
    ),
  },

  {
    accessorKey: "paymentDate",
    header: "تاريخ الدفع",
    cell: ({ row }) => {
      const date = new Date(row.original.paymentDate);
      return <div>{date.toLocaleDateString("ar-EN")}</div>;
    },
  },

  {
    accessorKey: "amount",
    header: "المبلغ",
    cell: ({ row }) => (
      <div className="font-semibold text-green-600">
        {Number(row.original.amount).toFixed(2)}
      </div>
    ),
  },

  {
    accessorKey: "paymentMethod",
    header: "طريقة الدفع",
    cell: ({ row }) => (
      <Badge variant="outline">{row.original.paymentMethod}</Badge>
    ),
  },

  {
    accessorKey: "note",
    header: "ملاحظة",
    cell: ({ row }) => (
      <span className="line-clamp-2 text-sm text-gray-600">
        {row.original.note || "—"}
      </span>
    ),
  },

  {
    accessorKey: "supplier.name",
    header: "المورد",
    cell: ({ row }) => (
      <div className="font-medium">{row.original.supplier?.name}</div>
    ),
  },

  {
    id: "actions",
    header: "إجراءات",
    cell: ({ row }) => {
      const [isOpen, setIsOpen] = useState(false);
      const payment = row.original;

      return (
        <Dailogreuse
          btnLabl="تعديل الدفعة "
          titel="  تعديل الدفعة"
          style="sm:max-w-4xl"
          open={isOpen}
          setOpen={setIsOpen}
        >
          <PaymentEditForm payment={payment} action={() => setIsOpen(false)} />
        </Dailogreuse>
      );
    },
  },
];
