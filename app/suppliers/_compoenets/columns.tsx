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
  Edit2,
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
import { deleteCustomer } from "@/app/actions/users";
import { useAuth } from "@/lib/context/AuthContext";
import { Edit, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import dynamic from "next/dynamic";
import SupplierForm from "@/components/forms/supplierform";
import { EditSupplierForm } from "./editform";
const PaymentCreateForm = dynamic(
  () => import("./PaymentCreateForm").then((m) => m.PaymentCreateForm),
  {
    ssr: false,
  },
);

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
    accessorKey: "totalPaid",
    header: "المدفوع",
    cell: ({ row }) => (
      <div className="font-semibold">
        {Number(row.original.totalPaid).toFixed(2)}
      </div>
    ),
  },
  {
    accessorKey: "totalPurchased",
    header: "إجمالي المشتريات",
    cell: ({ row }) => (
      <div className="font-semibold">
        {Number(row.original.totalPurchased).toFixed(2)}
      </div>
    ),
  },
  {
    accessorKey: "outstandingBalance",
    header: "الرصيد المتبقي",
    cell: ({ row }) => (
      <div className="font-semibold">
        {Number(row.original.outstandingBalance).toFixed(2)}
      </div>
    ),
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
    cell: ({ row }) => {
      const { user } = useAuth();
      if (!user) return;
      const supplier = row.original;

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
                onClick={() => navigator.clipboard.writeText(supplier.id)}
              >
                نسخ معرف المورد
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem></DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  await deleteCustomer(supplier.id, user.companyId);
                }}
              >
                <Trash className="mr-2 h-4 w-4" /> مسح
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <EditSupplierForm supplier={supplier} />
        </>
      );
    },
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
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Edit className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>تعديل الدفعة</DialogTitle>
            </DialogHeader>
            <PaymentEditForm
              payment={payment}
              action={() => setIsOpen(false)}
            />
          </DialogContent>
        </Dialog>
      );
    },
  },
];

export const purchaseColumns: ColumnDef<any>[] = [
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
    accessorKey: "supplier.name",
    header: "المورد",
  },

  {
    accessorKey: "createdAt",
    header: "تاريخ الشراء",
    cell: ({ row }) => {
      const date = new Date(row.original.createdAt);
      return <div>{date.toLocaleDateString("ar-EN")}</div>;
    },
  },

  {
    accessorKey: "purchaseItems",
    header: "العناصر",
    cell: ({ row }) => {
      const items = row.original.purchaseItems || [];
      return (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              {items.length} عنصر
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>عناصر الشراء</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {items.map((item: any, idx: number) => (
                <div key={idx} className="rounded-lg border p-3">
                  <p className="font-medium">{item.product.name}</p>
                  <p className="text-sm text-gray-500">
                    رقم الصنف: {item.product.sku}
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">الكمية:</span>{" "}
                      {item.quantity}
                    </div>
                    <div>
                      <span className="text-gray-600">تكلفة الوحدة:</span>{" "}
                      {item.unitCost}
                    </div>
                    <div>
                      <span className="text-gray-600">الإجمالي:</span>{" "}
                      {item.totalCost}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      );
    },
  },

  {
    accessorKey: "totalAmount",
    header: "المبلغ الإجمالي",
    cell: ({ row }) => (
      <div className="font-semibold">
        {Number(row.original.totalAmount).toFixed(2)}
      </div>
    ),
  },

  {
    accessorKey: "amountPaid",
    header: "المبلغ المدفوع",
    cell: ({ row }) => (
      <div className="font-medium text-green-600">
        {Number(row.original.amountPaid).toFixed(2)}
      </div>
    ),
  },

  {
    accessorKey: "amountDue",
    header: "المبلغ المتبقي",
    cell: ({ row }) => (
      <div
        className={
          Number(row.original.amountDue) > 0
            ? "font-medium text-red-600"
            : "text-green-600"
        }
      >
        {Number(row.original.amountDue).toFixed(2)}
      </div>
    ),
  },

  {
    accessorKey: "status",
    header: "الحالة",
    cell: ({ row }) => {
      const status = row.original.status;
      let color = "bg-gray-500";
      if (status === "pending") color = "bg-yellow-500";
      else if (status === "partial") color = "bg-blue-500";
      else if (status === "paid") color = "bg-green-500";
      else if (status === "received") color = "bg-purple-500";

      const statusArabic: Record<string, string> = {
        pending: "قيد الانتظار",
        partial: "مدفوع جزئيًا",
        paid: "مدفوع",
        received: "تم الاستلام",
      };

      return <Badge className={color}>{statusArabic[status] || status}</Badge>;
    },
  },

  {
    id: "actions",
    header: "إجراءات",
    cell: ({ row }) => {
      const supplierId = row.original;
      const supplier_name = row.original.name;
      return (
        <PaymentCreateForm
          supplier={supplierId}
          supplier_name={supplier_name}
        />
      );
    },
  },
];
