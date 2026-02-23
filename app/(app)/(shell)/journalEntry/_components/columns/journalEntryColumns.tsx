"use client";
import { ColumnDef } from "@tanstack/react-table";
import dynamic from "next/dynamic";

const FiscalYearDetailsDialog = dynamic(
  () => import("../../_components/FiscalYearDetailsDialog"),
  { ssr: false },
);

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowDown, ArrowUp, ArrowUpDown, Eye } from "lucide-react";
export interface FiscalYearData {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
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
export const fiscalYearColumns: ColumnDef<FiscalYearData>[] = [
  // -----------------------------------------
  // SELECT CHECKBOX
  // -----------------------------------------
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

  // -----------------------------------------
  // INDEX
  // -----------------------------------------
  {
    id: "index",
    header: "#",
    cell: ({ row }) => row.index + 1,
    enableSorting: false,
    enableHiding: false,
  },

  // -----------------------------------------
  // NAME (2024–2025)
  // -----------------------------------------
  {
    accessorKey: "period_name",
    header: ({ column }) => (
      <SortableHeader column={column} label="اسم السنة المالية" />
    ),
    cell: ({ row }) => (
      <span className="font-semibold">{row.getValue("period_name")}</span>
    ),
  },

  // -----------------------------------------
  // START DATE
  // -----------------------------------------
  {
    accessorKey: "start_date",
    header: ({ column }) => (
      <SortableHeader column={column} label="تاريخ البداية" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("start_date"));
      return date.toLocaleDateString("ar-IQ");
    },
  },

  // -----------------------------------------
  // END DATE
  // -----------------------------------------
  {
    accessorKey: "end_date",
    header: ({ column }) => (
      <SortableHeader column={column} label="تاريخ النهاية" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("end_date"));
      return date.toLocaleDateString("ar-IQ");
    },
  },

  // -----------------------------------------
  // ACTIVE STATUS
  // -----------------------------------------
  {
    accessorKey: "is_closed",
    header: ({ column }) => <SortableHeader column={column} label="الحالة" />,
    cell: ({ row }) => {
      const isActive = row.getValue("is_closed") as boolean;

      return (
        <Badge
          className={
            isActive
              ? "bg-gray-200 text-lg text-gray-700"
              : "bg-green-100 text-lg text-green-800"
          }
        >
          {isActive ? "غير نشطة" : "نشطة"}
        </Badge>
      );
    },
  },

  // -----------------------------------------
  // CREATED AT
  // -----------------------------------------
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <SortableHeader column={column} label="تاريخ الإنشاء" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("created_at"));
      return date.toLocaleDateString("ar-IQ");
    },
  },

  // -----------------------------------------
  // UPDATED AT
  // -----------------------------------------
  // Assuming your column definition looks like this:
  {
    accessorKey: "closed_at",
    header: ({ column }) => (
      <SortableHeader column={column} label="تاريخ الإغلاق" />
    ),
    cell: ({ row }) => {
      // 1. Get the value and explicitly type cast it (as unknown first)
      // to tell TypeScript what type to expect for the Date constructor.
      const closedAtValue = row.getValue("closed_at") as unknown as
        | string
        | Date
        | number
        | null
        | undefined;

      // 2. Check if the value is null, undefined, or an empty string/object.
      // If it is, return null (or your preferred placeholder, like "—").
      if (
        !closedAtValue ||
        (typeof closedAtValue === "object" &&
          Object.keys(closedAtValue).length === 0)
      ) {
        return null;
      }

      // 3. Create the Date object. TypeScript is now happy because the type is correct.
      const date = new Date(closedAtValue);

      // 4. Check for 'Invalid Date' result
      if (isNaN(date.getTime())) {
        return null;
      }

      // 5. Return the correctly formatted date string
      return date.toLocaleDateString("ar-IQ");
    },
  },
  {
    accessorKey: "closed_by",
    header: "مُغلق بواسطة",
  },

  // -----------------------------------------
  // ACTIONS COLUMN
  // -----------------------------------------
  {
    id: "actions",
    enableHiding: false,
    header: "الإجراءات",
    cell: ({ row }) => {
      const fy = row.original;

      return (
        <div className="flex gap-2">
          <FiscalYearDetailsDialog fiscalYear={fy} />
        </div>
      );
    },
  },
];
