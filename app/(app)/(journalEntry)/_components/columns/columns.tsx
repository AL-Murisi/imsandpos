"use client";

import { VoucherReceipt } from "@/components/common/VoucherReceipt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useCompany } from "@/hooks/useCompany";
import { ColumnDef } from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowDownCircle,
  ArrowUp,
  ArrowUpCircle,
  ArrowUpDown,
  CircleDollarSign,
  Eye,
} from "lucide-react";
import dynamic from "next/dynamic";

const JournalEntryDetailsDialog = dynamic(
  () => import("../JournalEntryDetailsDialog"),
  { ssr: false },
);

interface JournalEntryData {
  id: string;
  entryNumber: string;
  entryDate: string;
  description?: string | null;
  status: string;
  referenceType?: string | null;
  createdUser?: {
    name?: string | null;
    email?: string | null;
  } | null;
  lines: {
    debit: number;
    credit: number;
    currencyCode?: string | null;
    memo?: string | null;
    account: {
      account_code: string | null;
      account_name_ar: string | null;
      account_name_en: string;
    };
  }[];
  debit: number;
  credit: number;
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

export const journalEntryColumns: ColumnDef<JournalEntryData>[] = [
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
    accessorKey: "entryNumber",
    header: ({ column }) => (
      <SortableHeader column={column} label="رقم القيد" />
    ),
    cell: ({ row }) => (
      <span className="font-mono font-semibold">
        {row.getValue("entryNumber")}
      </span>
    ),
  },
  {
    accessorKey: "entryDate",
    header: ({ column }) => <SortableHeader column={column} label="التاريخ" />,
    cell: ({ row }) => {
      const date = new Date(row.getValue("entryDate"));
      return date.toLocaleDateString("ar-IQ");
    },
  },
  {
    id: "accounts",
    header: ({ column }) => <SortableHeader column={column} label="الحسابات" />,
    cell: ({ row }) => {
      const accounts = row.original.lines.map(
        (line) => line.account.account_name_ar || line.account.account_name_en,
      );
      const preview = accounts.slice(0, 2).join("، ");
      const extra = accounts.length > 2 ? ` (+${accounts.length - 2})` : "";
      return (
        <span>
          {preview || "—"}
          {extra}
        </span>
      );
    },
  },
  {
    id: "currencies",
    header: ({ column }) => <SortableHeader column={column} label="العملات" />,
    cell: ({ row }) => {
      const codes = Array.from(
        new Set(
          row.original.lines
            .map((line) => line.currencyCode || "")
            .filter(Boolean),
        ),
      );
      return <span className="font-mono">{codes.join(", ") || "—"}</span>;
    },
  },
  {
    accessorKey: "createdUser.name",
    header: ({ column }) => (
      <SortableHeader column={column} label="أنشأ بواسطة" />
    ),
    cell: ({ row }) => {
      const createdBy = row.original.createdUser?.name;
      return <span>{createdBy || "—"}</span>;
    },
  },
  {
    accessorKey: "description",
    header: ({ column }) => <SortableHeader column={column} label="الوصف" />,
    cell: ({ row }) => (
      <div
        className="text-md max-w-xs truncate"
        title={row.getValue("description") as string}
      >
        {row.getValue("description") as string}
      </div>
    ),
  },
  {
    accessorKey: "debit",
    header: ({ column }) => <SortableHeader column={column} label="مدين" />,
    cell: ({ row }) => {
      const debit = row.getValue("debit") as number;

      if (!debit || debit <= 0) {
        return <span className="text-gray-400">-</span>;
      }

      return (
        <div
          dir="ltr"
          className="flex items-center gap-1 font-mono text-lg font-semibold text-green-600"
        >
          <span className="tabular-nums">{debit}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "credit",
    header: ({ column }) => <SortableHeader column={column} label="دائن" />,
    cell: ({ row }) => {
      const credit = row.getValue("credit") as number;

      if (!credit || credit <= 0) {
        return <span className="text-lg text-gray-400">-</span>;
      }

      return (
        <div
          dir="ltr"
          className="flex items-center gap-1 font-mono text-lg font-semibold text-red-600"
        >
          <span className="tabular-nums">{credit}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => <SortableHeader column={column} label="الحالة" />,
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const isPosted = status === "POSTED";
      return (
        <Badge
          className={
            isPosted
              ? "bg-green-100 text-lg text-green-800"
              : "bg-yellow-100 text-lg text-yellow-800"
          }
        >
          {isPosted ? "مرحل" : "قيد الإنشاء"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "referenceType",
    header: ({ column }) => <SortableHeader column={column} label="المرجع" />,
    cell: ({ row }) => {
      const refType = row.getValue("referenceType") as string | null;
      if (!refType) return <span className="text-lg">-</span>;

      const typeMap: Record<string, string> = {
        sale: "بيع",
        purchase: "شراء",
        expense: "مصروف",
        payment: "دفعة",
        supplier_payment: "دفعة لمورد",
        opening_balance: "رصيد افتتاحي",
      };

      return <span className="text-lg">{typeMap[refType] || refType}</span>;
    },
  },
  {
    id: "actions",
    enableHiding: false,
    header: "الإجراءات",
    cell: ({ row }) => {
      const entry = row.original;
      return (
        <div className="flex gap-2">
          <JournalEntryDetailsDialog entry={entry} />
        </div>
      );
    },
  },
];

// 🔢 Voucher Type based on your FinancialTransaction model
export type FinancialVoucher = {
  id: string;
  voucherNumber: number;
  type: "RECEIPT" | "PAYMENT";
  amount: number;
  currencyCode: string;
  paymentMethod: string;
  date: string | Date;
  invoice: { invoiceNumber: string };
  notes?: string;
  customer?: { name: string };
  supplier?: { name: string };
  employee?: { name: string };
  expense?: { expense_number: string };
};

export const voucherColumns: ColumnDef<FinancialVoucher>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
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
  },
  {
    accessorKey: "voucherNumber",
    header: ({ column }) => (
      <SortableHeader column={column} label="رقم السند" />
    ),
    cell: ({ row }) => {
      const num = String(row.original.voucherNumber).padStart(5, "0");
      const prefix = row.original.type === "RECEIPT" ? "RV-" : "PV-";
      return (
        <span className="font-mono font-bold">
          {prefix}
          {num}
        </span>
      );
    },
  },
  {
    accessorKey: "type",
    header: "نوع السند",
    cell: ({ row }) => {
      const isReceipt = row.original.type === "RECEIPT";
      return (
        <Badge className={isReceipt ? "bg-green-600" : "bg-red-600"}>
          {isReceipt ? (
            <ArrowDownCircle className="mr-1 h-3 w-3" />
          ) : (
            <ArrowUpCircle className="mr-1 h-3 w-3" />
          )}
          {isReceipt ? "سند قبض" : "سند صرف"}
        </Badge>
      );
    },
  },
  {
    id: "party",
    header: "الطرف",
    cell: ({ row }) => {
      const voucher = row.original;
      const name =
        row.original.customer?.name ||
        row.original.supplier?.name ||
        row.original.employee?.name ||
        voucher.invoice?.invoiceNumber ||
        voucher.expense?.expense_number;
      return <span>{name}</span>;
    },
  },
  {
    accessorKey: "amount",
    header: ({ column }) => <SortableHeader column={column} label="المبلغ" />,
    cell: ({ row }) => (
      <div className="text-primary font-bold">
        {new Intl.NumberFormat().format(row.original.amount)}{" "}
        {row.original.currencyCode}
      </div>
    ),
  },
  {
    accessorKey: "paymentMethod",
    header: "طريقة الدفع",
    cell: ({ row }) => (
      <div className="flex items-center gap-1 text-xs">
        <CircleDollarSign className="text-muted-foreground h-3 w-3" />
        {row.original.paymentMethod === "cash" ? "نقداً" : "بنكي / شيك"}
      </div>
    ),
  },
  {
    accessorKey: "date",
    header: ({ column }) => <SortableHeader column={column} label="التاريخ" />,
    cell: ({ row }) => new Date(row.original.date).toLocaleDateString("ar-EG"),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const voucher = row.original;

      // 1. استخراج بيانات الشركة باستخدام الـ Hook الذي تملكه
      const { company } = useCompany();

      // 2. تجهيز بيانات الطرف (عميل أو مورد)
      const partyName = voucher.customer?.name || voucher.supplier?.name;
      return (
        <div className="flex items-center gap-2">
          <VoucherReceipt
            voucherNumber={voucher.voucherNumber}
            voucherType={voucher.type}
            amount={voucher.amount}
            curruncy={voucher.currencyCode}
            personName={
              partyName ??
              voucher.invoice?.invoiceNumber ??
              voucher.expense?.expense_number
            }
            description={voucher.notes || "بدون وصف"}
            paymentMethod={voucher.paymentMethod === "cash" ? "نقداً" : "بنكي"}
            date={voucher.date}
            company={{
              name: company?.name || "",
              address: company?.address,
              city: company?.city,
              phone: company?.phone,
              logoUrl: company?.logoUrl,
            }}
          />

          <Button variant="ghost" size="sm" title="عرض التفاصيل">
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      );
    },
  },
];
