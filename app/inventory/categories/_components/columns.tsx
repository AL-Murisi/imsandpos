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
import { CategorySchema } from "@/lib/zod";
import { z } from "zod";
import { deleteCategory, toggleCategoryActive } from "@/app/actions/category";

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
export type User = z.infer<typeof CategorySchema>;
export const columns: ColumnDef<User>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        // 🔹 Translation: "Select all" -> "تحديد الكل"
        aria-label="تحديد الكل"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        // 🔹 Translation: "Select row" -> "تحديد الصف"
        aria-label="تحديد الصف"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "isActive",
    // 🔹 Translation: "Status" -> "الحالة"
    header: "الحالة",

    cell: ({ row }) => {
      const status = row.original.isActive;
      let color = "";
      let label = "";
      let icon = null;

      switch (status) {
        case true:
          color = "bg-green-100 text-green-800";
          // 🔹 Translation: "Active" -> "نشط"
          label = "نشط";
          icon = <CheckCircle className="mr-1 h-4 w-4" />;
          break;
        default:
          color = "bg-yellow-100 text-yellow-800";
          // 🔹 Translation: "Not Active" -> "غير نشط"
          label = "غير نشط";
          icon = <Clock className="mr-1 h-4 w-4" />;
          break;
      }

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
    // 🔹 Translation: "Name" -> "الاسم"
    header: ({ column }) => <SortableHeader column={column} label="الاسم" />,
    cell: ({ row }) => <div className="lowercase">{row.getValue("name")}</div>,
  },
  {
    accessorKey: "description",
    // 🔹 Translation: "description" -> "الوصف"
    header: ({ column }) => <SortableHeader column={column} label="الوصف" />,
    cell: ({ row }) => (
      <div className="lowercase">{row.getValue("description")}</div>
    ),
  },
  {
    accessorKey: "parentId",
    // 🔹 Translation: "parentid" -> "معرّف الأصل" or "المعرّف الأب"
    header: ({ column }) => (
      <SortableHeader column={column} label="المعرّف الأب" />
    ),
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("parentId")}</div>
    ),
  },

  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const category = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">فتح القائمة</span>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>

            {/* Copy ID */}
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(category.id)}
            >
              نسخ معرّف الفئة
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Edit */}
            <DropdownMenuItem onClick={() => openEditDialog(category)}>
              تعديل
            </DropdownMenuItem>

            {/* Delete */}
            <DropdownMenuItem
              onClick={async () => {
                if (confirm("هل أنت متأكد من حذف هذه الفئة؟")) {
                  await deleteCategory(category.id);
                }
              }}
            >
              حذف
            </DropdownMenuItem>

            {/* Activate / Deactivate */}
            <DropdownMenuItem
              onClick={async () => {
                await toggleCategoryActive(category.id, !category.isActive);
              }}
            >
              {category.isActive ? "تعطيل" : "تفعيل"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
function openEditDialog(category: any): void {
  throw new Error("Function not implemented.");
}
