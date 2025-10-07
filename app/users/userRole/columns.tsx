"use client";
import { ColumnDef, Column } from "@tanstack/react-table";
import { ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal } from "lucide-react";

import { Button } from "../../../components/ui/button";
import { Checkbox } from "../../../components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "../../../components/ui/dropdown-menu";

import { Badge } from "../../../components/ui/badge";

import { z } from "zod";
import { RoleSchema } from "@/lib/zod";

// Zod type inference
export type RoleTableRow = z.infer<typeof RoleSchema>;

// Sortable header component
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
          تصاعدي
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
          <ArrowDown className="mr-2 h-4 w-4" />
          تنازلي
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Columns definition
export const columns: ColumnDef<RoleTableRow>[] = [
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
        aria-label="تحديد صف"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },

  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column} label="الدور" />,
    cell: ({ row }) => <div className="lowercase">{row.getValue("name")}</div>,
  },
  {
    accessorKey: "description",
    header: ({ column }) => <SortableHeader column={column} label="الدوtر" />,
    cell: ({ row }) => (
      <div className="lowercase">{row.getValue("description")}</div>
    ),
  },
  {
    accessorKey: "permissions",
    header: ({ column }) => (
      <SortableHeader column={column} label="الصلاحيات" />
    ),
    cell: ({ row }) => {
      const permissions = row.getValue("permissions") as Record<
        string,
        boolean
      >;
      const activeTasks = Object.keys(permissions).filter(
        (key) => permissions[key],
      );

      return (
        <div className="flex flex-wrap gap-1">
          {activeTasks.map((task, i) => (
            <Badge
              key={i}
              className="rounded-md bg-fuchsia-600 px-2 py-1 text-xs"
            >
              {task}
            </Badge>
          ))}
        </div>
      );
    },
  },

  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const role = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(role.id)}
            >
              نسخ معرف الدور
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>عرض التفاصيل</DropdownMenuItem>
            <DropdownMenuItem>حذف</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
