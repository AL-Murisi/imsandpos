"use client";

import CustomDialog from "@/components/common/Dailog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, EditIcon } from "lucide-react";
interface DebtSaleData {
  id: string;
  totalAmount: string; // As string from FetchDebtSales
  amountPaid: string;
  amountDue: string;
  saleDate: string;
  createdAt: string;
  paymentStatus: string;
  customer: {
    name: string;
    phoneNumber: string | null;
  };
  // Add any other properties from your Prisma `Sale` select
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

export const debtSale: ColumnDef<DebtSaleData>[] = [
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

  // {
  //   accessorKey: "customer.name",
  //   header: ({ column }) => (
  //     <SortableHeader column={column} label="اسم الزبون" />
  //   ),
  // },
  // {
  //   accessorKey: "customer.phoneNumber",
  //   header: ({ column }) => (
  //     <SortableHeader column={column} label="رقم الهاتف" />
  //   ),
  // },
  {
    accessorKey: "totalAmount",
    header: ({ column }) => <SortableHeader column={column} label="الإجمالي" />,
    cell: ({ row }) => <div>{row.getValue("totalAmount")} $</div>,
  },
  {
    accessorKey: "amountPaid",
    header: ({ column }) => <SortableHeader column={column} label="المدفوع" />,
    cell: ({ row }) => <div>{row.getValue("amountPaid")} $</div>,
  },
  {
    accessorKey: "amountDue",
    header: ({ column }) => <SortableHeader column={column} label="المتبقي" />,
    cell: ({ row }) => <div>{row.getValue("amountDue")} $</div>,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <SortableHeader column={column} label="تاريخ البيع" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"));
      return <div>{date.toLocaleDateString("ar-EG")}</div>;
    },
  },
  {
    accessorKey: "paymentStatus",
    header: ({ column }) => <SortableHeader column={column} label="الحالة" />,
    cell: ({ row }) => {
      const status = row.getValue("paymentStatus");
      const color =
        status === "paid"
          ? "bg-green-100 text-green-800"
          : status === "partial"
            ? "bg-yellow-100 text-yellow-800"
            : "bg-red-100 text-red-800";

      const label =
        status === "paid"
          ? "مدفوع"
          : status === "partial"
            ? "جزئي"
            : "غير مدفوع";

      return <Badge className={color}>{label}</Badge>;
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const debt = row.original;
      return (
        <CustomDialog
          trigger={
            <Button variant="outline">
              <EditIcon />
            </Button>
          }
          title="إضافة منتج"
          description="أدخل تفاصيل المنتج واحفظه"
        >
          {/* <Debtupdate debt={debt} /> */}
        </CustomDialog>
      );
    },
  },
];
