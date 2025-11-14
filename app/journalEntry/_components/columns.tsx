"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Eye } from "lucide-react";
import JournalEntryDetailsDialog from "./JournalEntryDetailsDialog";

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
      const debit = row.getValue("debit") as number;
      return debit > 0 ? (
        <span className="font-mono text-lg font-semibold text-green-600">
          {new Intl.NumberFormat("ar-YE", {
            style: "currency",
            currency: "YER",
            numberingSystem: "latn",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(debit)}
        </span>
      ) : (
        <span className="text-gray-400">-</span>
      );
    },
  },
  {
    accessorKey: "credit",
    header: ({ column }) => <SortableHeader column={column} label="دائن" />,
    cell: ({ row }) => {
      const credit = row.getValue("credit") as number;
      return credit > 0 ? (
        <span className="font-mono font-semibold text-red-600">
          {new Intl.NumberFormat("ar-YE", {
            style: "currency",
            currency: "YER",
            numberingSystem: "latn",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(credit)}
        </span>
      ) : (
        <span className="text-lg text-gray-400">-</span>
      );
    },
  },

  {
    accessorKey: "is_automated",
    header: ({ column }) => <SortableHeader column={column} label="النوع" />,
    cell: ({ row }) => {
      const isAutomated = row.getValue("is_automated") as boolean;
      return (
        <Badge
          className={
            isAutomated
              ? "bg-blue-100 text-lg text-blue-800"
              : "bg-purple-100 text-lg text-purple-800"
          }
        >
          {isAutomated ? "تلقائي" : "يدوي"}
        </Badge>
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
