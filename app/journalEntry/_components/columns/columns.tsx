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
  Printer,
} from "lucide-react";
import dynamic from "next/dynamic";
const JournalEntryDetailsDialog = dynamic(
  () => import("../../_components/JournalEntryDetailsDialog"),
  { ssr: false },
);
interface JournalEntryData {
  id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  debit: number;
  credit: number;
  is_posted: boolean;
  is_automated: boolean;
  reference_type: string | null;
  reference_id: string | null;
  fiscal_period: string | null;
  currency_code: string;
  posted_by: {
    id: string;
    name: string;
    email: string | null;
  } | null; // optional if entry hasn't been posted
  created_by: string;
  users_journal_entries_created_byTousers: {
    name: string;
  };
  users_journal_entries_updated_byTousers: {
    name: string;
  };
  accounts: {
    account_code: string | null;
    account_name_ar: string | null;
    account_name_en: string;
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
    accessorKey: "entry_number",
    header: ({ column }) => (
      <SortableHeader column={column} label="رقم القيد" />
    ),
    cell: ({ row }) => (
      <span className="font-mono font-semibold">
        {row.getValue("entry_number")}
      </span>
    ),
  },
  {
    accessorKey: "currency_code",
    header: ({ column }) => (
      <SortableHeader column={column} label="currency_code القيد" />
    ),
    cell: ({ row }) => (
      <span className="font-mono font-semibold">
        {row.getValue("currency_code")}
      </span>
    ),
  },
  {
    accessorKey: "entry_date",
    header: ({ column }) => <SortableHeader column={column} label="التاريخ" />,
    cell: ({ row }) => {
      const date = new Date(row.getValue("entry_date"));
      return date.toLocaleDateString("ar-IQ");
    },
  },
  {
    accessorKey: "accounts.account_code",
    header: ({ column }) => (
      <SortableHeader column={column} label="رمز الحساب" />
    ),
    cell: ({ row }) => (
      <span className="font-mono">{row.original.accounts.account_code}</span>
    ),
  },
  {
    accessorKey: "accounts.account_name_en",
    header: ({ column }) => (
      <SortableHeader column={column} label="اسم الحساب" />
    ),
    cell: ({ row }) => {
      const nameAr = row.original.accounts.account_name_ar;
      const nameEn = row.original.accounts.account_name_en;
      return <span>{nameAr || nameEn}</span>;
    },
  },
  {
    accessorKey: "posted_by.name",
    header: ({ column }) => (
      <SortableHeader column={column} label="تم الترحيل بواسطة" />
    ),
    cell: ({ row }) => {
      const posted_by = row.original.posted_by; // already mapped
      return <span>{posted_by?.name || "—"}</span>;
    },
  },
  {
    accessorKey: "period_name,",
    header: ({ column }) => (
      <SortableHeader column={column} label="السنة المالية" />
    ),
    cell: ({ row }) => {
      const posted_by = row.original.fiscal_period; // already mapped
      return <span>{posted_by || "—"}</span>;
    },
  },
  {
    accessorKey: "users_journal_entries_created_byTousers.name",
    header: ({ column }) => (
      <SortableHeader column={column} label="أنشأ بواسطة" />
    ),
    cell: ({ row }) => {
      const createdBy =
        row.original.users_journal_entries_created_byTousers?.name;
      return <span>{createdBy || "—"}</span>;
    },
  },
  {
    accessorKey: "users_journal_entries_updated_byTousers.name",
    header: ({ column }) => (
      <SortableHeader column={column} label="آخر تعديل بواسطة" />
    ),
    cell: ({ row }) => {
      const updatedBy =
        row.original.users_journal_entries_updated_byTousers?.name;
      return <span>{updatedBy || "—"}</span>;
    },
  },

  {
    accessorKey: "description",
    header: ({ column }) => <SortableHeader column={column} label="الوصف" />,
    cell: ({ row }) => (
      <div
        className="text-md max-w-xs truncate"
        title={row.getValue("description")}
      >
        {row.getValue("description")}
      </div>
    ),
  },
  {
    accessorKey: "debit",
    header: ({ column }) => <SortableHeader column={column} label="مدين" />,
    cell: ({ row }) => {
      const currency = row.original.currency_code;
      const debit = row.getValue("debit") as number;

      if (!debit || debit <= 0) {
        return <span className="text-gray-400">-</span>;
      }

      const currencyLabel =
        currency === "USD" ? "$" : currency === "YER" ? "ر.ي" : "ر.س";

      return (
        <div
          dir="ltr"
          className="flex items-center gap-1 font-mono text-lg font-semibold text-green-600"
        >
          <span className="text-sm opacity-70">{currencyLabel}</span>
          <span className="tabular-nums">{debit}</span>
        </div>
      );
    },
  },

  {
    accessorKey: "credit",
    header: ({ column }) => <SortableHeader column={column} label="دائن" />,
    cell: ({ row }) => {
      const currency = row.original.currency_code;
      const credit = row.getValue("credit") as number;

      if (!credit || credit <= 0) {
        return <span className="text-lg text-gray-400">-</span>;
      }

      const currencyLabel =
        currency === "USD" ? "$" : currency === "YER" ? "ر.ي" : "ر.س";

      return (
        <div
          dir="ltr"
          className="flex items-center gap-1 font-mono text-lg font-semibold text-red-600"
        >
          <span className="text-sm opacity-70">{currencyLabel}</span>
          <span className="tabular-nums">{credit}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "is_posted",
    header: ({ column }) => <SortableHeader column={column} label="الحالة" />,
    cell: ({ row }) => {
      const isPosted = row.getValue("is_posted") as boolean;
      return (
        <Badge
          className={
            isPosted
              ? "bg-green-100 text-lg text-green-800"
              : "bg-yellow-100 text-lg text-yellow-800"
          }
        >
          {isPosted ? "مرحّل" : "قيد الإنشاء"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "reference_type",
    header: ({ column }) => <SortableHeader column={column} label="المرجع" />,
    cell: ({ row }) => {
      const refType = row.getValue("reference_type") as string | null;
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
  notes?: string;
  customer?: { name: string };
  supplier?: { name: string };
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
      const name =
        row.original.customer?.name ||
        row.original.supplier?.name ||
        "مصروفات عامة";
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
      const partyName =
        voucher.customer?.name || voucher.supplier?.name || "مصروفات عامة";

      return (
        <div className="flex items-center gap-2">
          {/* مكون الطباعة مع تمرير البيانات الحقيقية */}
          <VoucherReceipt
            voucherNumber={voucher.voucherNumber} // رقم السند (سيقوم المكون بعمل padding له)
            voucherType={voucher.type} // RECEIPT أو PAYMENT
            amount={voucher.amount}
            personName={partyName}
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
