"use client";
import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
const ExpenseEditForm = dynamic(
  () => import("./ExpenseEditForm").then((m) => m.ExpenseEditForm),
  {
    ssr: false,
  },
);
export const expenseColumns: ColumnDef<any>[] = [
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
  },

  {
    accessorKey: "expenseNumber",
    header: "رقم المصروف",
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.getValue("expenseNumber")}</span>
    ),
  },

  {
    accessorKey: "description",
    header: "الوصف",
    cell: ({ row }) => (
      <div className="max-w-xs truncate">{row.getValue("description")}</div>
    ),
  },

  {
    accessorKey: "category",
    header: "الفئة",
    cell: ({ row }) => {
      const category = row.original.category;
      return (
        <Badge variant="outline" className="">
          {category?.name || "غير محدد"}
        </Badge>
      );
    },
  },

  {
    accessorKey: "amount",
    header: "المبلغ",
    cell: ({ row }) => (
      <div className="font-semibold">
        {parseFloat(row.getValue("amount")).toFixed(2)}
      </div>
    ),
  },

  {
    accessorKey: "paymentMethod",
    header: "طريقة الدفع",
    cell: ({ row }) => {
      const methods: Record<string, string> = {
        cash: "نقداً",
        bank: "تحويل بنكي",
        card: "بطاقة",
        check: "شيك",
      };
      const method = row.getValue("paymentMethod") as string;
      return <span className="">{methods[method] || method}</span>;
    },
  },

  {
    accessorKey: "expenseDate",
    header: "التاريخ",
    cell: ({ row }) => {
      const date = new Date(row.getValue("expenseDate"));
      return <div className="">{date.toLocaleDateString("ar-EG")}</div>;
    },
  },

  {
    accessorKey: "status",
    header: "الحالة",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const colors: Record<string, string> = {
        pending: "bg-yellow-500",
        approved: "bg-green-500",
        rejected: "bg-red-500",
        paid: "bg-purple-500",
      };
      const labels: Record<string, string> = {
        pending: "قيد الانتظار",
        approved: "موافق عليه",
        rejected: "مرفوض",
        paid: "مدفوع",
      };
      return (
        <Badge className={`${colors[status] || "bg-gray-500"} text-white`}>
          {labels[status] || status}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    header: "الإجراءات",
    cell: ({ row }) => {
      const exponses = row.original;
      return <ExpenseEditForm expense={exponses} />;
    },
    enableSorting: false,
  },
];
