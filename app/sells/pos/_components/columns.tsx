"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUp, ArrowDown, ArrowUpDown, EditIcon } from "lucide-react";

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

// 🧱 POS Table Columns
export const posColumns: ColumnDef<any>[] = [
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
    accessorKey: "name",
    header: ({ column }) => (
      <SortableHeader column={column} label="اسم نقطة البيع" />
    ),
  },

  {
    accessorKey: "location",
    header: ({ column }) => <SortableHeader column={column} label="الموقع" />,
    cell: ({ row }) => <div>{row.getValue("location") || "غير محدد"}</div>,
  },

  {
    accessorKey: "manager.name",
    header: ({ column }) => <SortableHeader column={column} label="المدير" />,
    cell: ({ row }) => <div>{row.original.manager?.name || "—"}</div>,
  },

  {
    accessorKey: "manager.email",
    header: ({ column }) => (
      <SortableHeader column={column} label="البريد الإلكتروني" />
    ),
    cell: ({ row }) => <div>{row.original.manager?.email || "—"}</div>,
  },

  {
    accessorKey: "is_active",
    header: ({ column }) => <SortableHeader column={column} label="الحالة" />,
    cell: ({ row }) => {
      const active = row.getValue("is_active") as boolean;
      return (
        <Badge
          className={
            active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }
        >
          {active ? "نشطة" : "معطّلة"}
        </Badge>
      );
    },
  },

  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <SortableHeader column={column} label="تاريخ الإنشاء" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("created_at"));
      return <div>{date.toLocaleDateString("ar-EG")}</div>;
    },
  },

  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const pos = row.original;
      return (
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <EditIcon className="mr-1 h-4 w-4" />
            تعديل
          </Button>
        </div>
      );
    },
  },
];
