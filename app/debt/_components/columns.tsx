"use client";

import CustomDialog from "@/components/common/Dailog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ColumnDef } from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  EditIcon,
  FileText,
} from "lucide-react";
import Debtupdate from "./form";
import DebtReport from "./DebtReport";
import { useCurrency } from "@/components/CurrencyProvider";

interface DebtSaleData {
  id: string;
  totalAmount: string;
  amountPaid: string;
  amountDue: string;
  saleDate: string;
  createdAt: string;
  paymentStatus: string;
  customerId: string;

  customer: {
    outstandingBalance?: number;
    name: string;
    phoneNumber: string | null;
    customerType: string;
  };
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
    id: "index",
    header: "#",
    cell: ({ row }) => row.index + 1,
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
      <SortableHeader column={column} label="نوع الزبون" />
    ),
  },
  // {
  //   accessorKey: "customer.outstandingBalance",
  //   header: "رصيد العميل",
  //   cell: ({ row }) => {
  //     const balance = row.original.outstandingBalance;

  //     const isDebit = balance > 0; // customer owes company
  //     const isCredit = balance < 0; // company owes customer

  //     return (
  //       <span
  //         className={`font-bold ${
  //           isDebit
  //             ? "text-red-600"
  //             : isCredit
  //               ? "text-green-600"
  //               : "text-gray-600"
  //         }`}
  //       >
  //         {balance > 0
  //           ? `+${balance.toFixed(2)} مدين`
  //           : balance < 0
  //             ? `${balance.toFixed(2)} دائن`
  //             : "0"}
  //       </span>
  //     );
  //   },
  // },
  {
    accessorKey: "customer.outstandingBalance",
    header: ({ column }) => (
      <SortableHeader column={column} label="رصيد العميل" />
    ),
    cell: ({ row }) => {
      const balance = row.original.customer?.outstandingBalance ?? 0;
      const color =
        balance > 0
          ? "text-green-600"
          : balance < 0
            ? "text-red-600"
            : "text-gray-600";

      const formatted = balance > 0 ? `+${balance}` : balance.toString();
      return <div className={color}>{formatted} $</div>;
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
    header: "الإجراءات",
    cell: ({ row }) => {
      const debt = row.original;
      return (
        <div className="flex gap-2">
          <CustomDialog
            trigger={
              <Button variant="outline" className="text-blue-600">
                <EditIcon className="h-4 w-4" />
              </Button>
            }
            title="تحديث الديون"
            description="قم بتحديث حالة الدين أو المبلغ المدفوع"
          >
            <Debtupdate debt={debt} />
          </CustomDialog>

          <DebtReport
            customerName={debt.customer?.name}
            customerID={debt.customerId}
          />
        </div>
      );
    },
  },
];
