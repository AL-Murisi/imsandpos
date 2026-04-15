"use client";
import { Column, ColumnDef } from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle,
  Clock,
  MoreHorizontal,
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

import { WarehouseUpdateDialog } from "./editform";
import { deleteWarehouse } from "@/lib/actions/warehouse";
import { ConfirmModal } from "@/components/common/confirm-modal";
import { useState } from "react";
import { toast } from "sonner";

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

// 🔢 User Type

export const columns: ColumnDef<any>[] = [
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
      let color = status
        ? "bg-green-100 text-green-800"
        : "bg-yellow-100 text-yellow-800";
      let label = status ? "نشط" : "غير نشط";
      let icon = status ? (
        <CheckCircle className="mr-1 h-4 w-4" />
      ) : (
        <Clock className="mr-1 h-4 w-4" />
      );
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
    cell: ({ row }) => <div>{row.getValue("name")}</div>,
  },
  {
    accessorKey: "location",
    header: ({ column }) => <SortableHeader column={column} label="location" />,
    cell: ({ row }) => <div>{row.getValue("location")}</div>,
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <SortableHeader column={column} label="البريد الإلكتروني" />
    ),
    cell: ({ row }) => <div>{row.getValue("email")}</div>,
  },
  {
    accessorKey: "phoneNumber",
    header: ({ column }) => (
      <SortableHeader column={column} label="رقم الهاتف" />
    ),
    cell: ({ row }) => <div>{row.getValue("phoneNumber")}</div>,
  },
  {
    accessorKey: "address",
    header: ({ column }) => <SortableHeader column={column} label="العنوان" />,
    cell: ({ row }) => <div>{row.getValue("address")}</div>,
  },
  {
    accessorKey: "city",
    header: ({ column }) => <SortableHeader column={column} label="المدينة" />,
    cell: ({ row }) => <div>{row.getValue("city")}</div>,
  },
  {
    accessorKey: "state",
    header: ({ column }) => (
      <SortableHeader column={column} label="الولاية / المنطقة" />
    ),
    cell: ({ row }) => <div>{row.getValue("state")}</div>,
  },
  {
    accessorKey: "country",
    header: ({ column }) => <SortableHeader column={column} label="الدولة" />,
    cell: ({ row }) => <div>{row.getValue("country")}</div>,
  },
  {
    accessorKey: "postalCode",
    header: ({ column }) => (
      <SortableHeader column={column} label="الرمز البريدي" />
    ),
    cell: ({ row }) => <div>{row.getValue("postalCode")}</div>,
  },

  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <SortableHeader column={column} label="تاريخ الإنشاء" />
    ),
    cell: ({ row }) => {
      const date = row.getValue("createdAt") as Date;
      return <div>{new Date(date).toLocaleDateString("ar-EG")}</div>;
    },
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => (
      <SortableHeader column={column} label="آخر تحديث" />
    ),
    cell: ({ row }) => {
      const date = row.getValue("updatedAt") as Date;
      return <div>{new Date(date).toLocaleDateString("ar-EG")}</div>;
    },
  },

  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const warehouse = row.original;
      const [isDeleting, setIsDeleting] = useState(false);
      return (
        <>
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">فتح القائمة</span>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>إجراءات</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => navigator.clipboard.writeText(warehouse.id)}
                >
                  نسخ رقم المعرف
                </DropdownMenuItem>
                <DropdownMenuSeparator />

                <DropdownMenuItem>تعطيل</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ConfirmModal
              title="تأكيد الحذف"
              description={`هل أنت متأكد من حذف هذا ${warehouse.name}؟ هذه العملية لا يمكن التراجع عنها.`}
              action={async () => {
                if (isDeleting) return;
                setIsDeleting(true);
                try {
                  const res = await deleteWarehouse(warehouse.id);
                  if (res.success) {
                    toast.success("تم حذف المستودع بنجاح");
                  } else {
                    toast.error(res.error || "فشل حذف المستودع");
                  }
                } catch (error) {
                  toast.error("حدث خطأ أثناء الحذف");
                  console.error(error);
                } finally {
                  setIsDeleting(false);
                }
              }}
              confirmText="حذف"
            >
              <Button
                disabled={isDeleting}
                className="text-red-600 hover:bg-orange-300/20 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </ConfirmModal>
            <WarehouseUpdateDialog warehouse={warehouse} />
          </>
        </>
      );
    },
  },
];
