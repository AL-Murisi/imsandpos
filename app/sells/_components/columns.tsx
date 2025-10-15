"use client";

import CustomDialog from "@/components/common/Dailog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, EditIcon } from "lucide-react";
import Debtupdate from "./form";
import Recitp from "./recitp";
import { useCurrency } from "@/components/CurrencyProvider";

interface DebtSaleData {
  id: string;
  totalAmount: string; // As string from FetchDebtSales
  amountPaid: string;
  amountDue: string;
  saleDate: string;
  createdAt: string;
  paymentStatus: string;
  customerId: string;
  saleNumber: string;
  customer: {
    name: string;
    phoneNumber: string | null;
    customerType: string;
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

export const debtSaleColumns: ColumnDef<DebtSaleData>[] = [
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
    accessorKey: "customer.name",
    header: ({ column }) => (
      <SortableHeader column={column} label="اسم الزبون" />
    ),
  },
  {
    accessorKey: "customer.phoneNumber",
    header: ({ column }) => (
      <SortableHeader column={column} label="رقم الهاتف" />
    ),
  },
  {
    accessorKey: "customer.customerType",
    header: ({ column }) => (
      <SortableHeader column={column} label="customerType" />
    ),
  },
  {
    accessorKey: "totalAmount",
    header: ({ column }) => <SortableHeader column={column} label="الإجمالي" />,
    cell: ({ row }) => {
      const price = row.getValue("totalAmount") as number;
      const { currency } = useCurrency();
      return price
        ? new Intl.NumberFormat(currency.locale, {
            style: "currency",
            currency: currency.currency,
            numberingSystem: "latn",
          }).format(price)
        : "N/A";
    },
  },
  {
    accessorKey: "amountPaid",
    header: ({ column }) => <SortableHeader column={column} label="المدفوع" />,
    cell: ({ row }) => {
      const price = row.getValue("amountPaid") as number;
      const { currency } = useCurrency();
      return price
        ? new Intl.NumberFormat(currency.locale, {
            style: "currency",
            currency: currency.currency,
            numberingSystem: "latn",
          }).format(price)
        : "N/A";
    },
  },
  {
    accessorKey: "saleNumber",
    header: ({ column }) => (
      <SortableHeader column={column} label="saleNumber" />
    ),
    cell: ({ row }) => <div>{row.getValue("saleNumber")} $</div>,
  },
  {
    accessorKey: "amountDue",
    header: ({ column }) => <SortableHeader column={column} label="المتبقي" />,
    cell: ({ row }) => {
      const price = row.getValue("amountDue") as number;
      const { currency } = useCurrency();
      return price
        ? new Intl.NumberFormat(currency.locale, {
            style: "currency",
            currency: currency.currency,
            numberingSystem: "latn",
          }).format(price)
        : "N/A";
    },
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
        <>
          <CustomDialog
            trigger={
              <Button variant="outline">
                <EditIcon />
              </Button>
            }
            title="إضافة منتج"
            description="أدخل تفاصيل المنتج واحفظه"
          >
            <Debtupdate debt={debt} />
          </CustomDialog>
          <Recitp id={debt.saleNumber} />
        </>
      );
    },
  },
];
