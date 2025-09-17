"use client";
import { Column, ColumnDef } from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle,
  Clock,
  MoreHorizontal,
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
import { WarehouseSchema } from "@/lib/zodType";
import { z } from "zod";

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
export type Warehouse = z.infer<typeof WarehouseSchema>;
export const columns: ColumnDef<Warehouse>[] = [
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
        <CheckCircle className="w-4 h-4 mr-1" />
      ) : (
        <Clock className="w-4 h-4 mr-1" />
      );
      return (
        <div
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${color}`}
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
      const user = row.original;
      return (
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
              onClick={() => navigator.clipboard.writeText(user.id)}
            >
              نسخ رقم المعرف
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>عرض الملف الشخصي</DropdownMenuItem>
            <DropdownMenuItem>تعطيل</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
