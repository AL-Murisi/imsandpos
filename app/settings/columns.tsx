"use client";

import { ColumnDef, Column } from "@tanstack/react-table";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";

/* 🔽 Sortable Header */
type SortableHeaderProps = {
  column: Column<any, unknown>;
  label: string;
};
const getCurrencyLabel = (currency: string) => {
  switch (currency?.toLowerCase()) {
    case "usd":
      return "دولار أمريكي";
    case "yer":
      return "ريال يمني";
    case "sar":
      return "ريال سعودي";
    default:
      return currency || ""; // إرجاع الرمز الأصلي إذا لم يكن ضمن القائمة
  }
};
const SortableHeader = ({ column, label }: SortableHeaderProps) => {
  const isSorted = column.getIsSorted();
  const Icon =
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
      <Icon className="h-4 w-4" />
    </Button>
  );
};

/* ✅ Exchange Rates Columns */
export const exchangeRateColumns: ColumnDef<any>[] = [
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
    accessorKey: "from_currency",
    header: "من العملة",
    cell: ({ row }) => (
      <Badge variant="outline">
        {getCurrencyLabel(row.original.from_currency)}
      </Badge>
    ),
  },
  {
    accessorKey: "to_currency",
    header: "إلى العملة",
    cell: ({ row }) => (
      <Badge className="bg-blue-600 text-white">
        {getCurrencyLabel(row.original.to_currency)}
      </Badge>
    ),
  },
  {
    accessorKey: "rate",
    header: "سعر الصرف",
    cell: ({ row }) => {
      const rate = Number(row.original.rate);
      return (
        <span className="font-semibold">
          {rate.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 6,
          })}
        </span>
      );
    },
  },
  {
    accessorKey: "date",
    header: ({ column }) => <SortableHeader column={column} label="التاريخ" />,
    cell: ({ row }) => {
      const date = new Date(row.getValue("date"));
      return <div className="">{date.toLocaleDateString("ar-EG")}</div>;
    },
  },
  {
    id: "actions",
    header: "الإجراءات",
    cell: ({ row }) => {
      const exponses = row.original;
      const category = row.original.account_category;
      // return <ExpenseEditForm expense={exponses} />;
    },
    enableSorting: false,
  },
];
