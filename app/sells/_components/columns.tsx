"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, EditIcon } from "lucide-react";
import Debtupdate from "./form";
import Recitp from "./recitp";
import { useCurrency } from "@/components/CurrencyProvider";
import { ReturnForm } from "./Returnitems";

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

export const debtSaleColumns: ColumnDef<any>[] = [
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
    header: "نوع العميل",
    cell: ({ row }) => {
      const customer = row.original.customer?.customerType ?? "";
      return (
        <Badge className="rounded-md bg-blue-600 text-xs text-white">
          {customer === "individual"
            ? "فردي"
            : customer === "commercial"
              ? "تجاري"
              : "-"}
        </Badge>
      );
    },
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
    cell: ({ row }) => <div>{row.getValue("saleNumber")}</div>,
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
    accessorKey: "sale_type",
    header: "نوع العملية",
    cell: ({ row }) => {
      const type = row.getValue("sale_type") as string;
      const label = type === "return" ? "إرجاع" : type === "sale" ? "بيع" : "-";
      const color =
        type === "return"
          ? "bg-red-100 text-red-800"
          : "bg-green-100 text-green-800";

      return <Badge className={color}>{label}</Badge>;
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
      const amountDue = Number(debt.amountDue) || 0; // ✅ convert to number safely

      return (
        <div className="flex flex-row gap-2">
          {amountDue > 0 && <Debtupdate debt={debt} />}
          <Recitp id={debt.saleNumber} />
          {debt.sale_type === "sale" && <ReturnForm sale={debt} />}
        </div>
      );
    },
  },
];
