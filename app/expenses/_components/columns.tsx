import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Edit, Trash2 } from "lucide-react";

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
    accessorKey: "#",
    header: "#",
    cell: ({ row }) => row.index + 1,
  },

  {
    accessorKey: "expenseNumber",
    header: "رقم المصروف",
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.expenseNumber}</span>
    ),
  },

  {
    accessorKey: "description",
    header: "الوصف",
    cell: ({ row }) => (
      <div className="max-w-xs truncate">{row.original.description}</div>
    ),
  },

  {
    accessorKey: "category.name",
    header: "الفئة",
    cell: ({ row }) => (
      <Badge variant="outline">{row.original.category?.name}</Badge>
    ),
  },

  {
    accessorKey: "amount",
    header: "المبلغ",
    cell: ({ row }) => (
      <div className="font-semibold">
        {Number(row.original.amount).toFixed(2)}
      </div>
    ),
  },

  {
    accessorKey: "paymentMethod",
    header: "طريقة الدفع",
    cell: ({ row }) => {
      const methods: Record<string, string> = {
        cash: "نقداً",
        bank_transfer: "تحويل بنكي",
        check: "شيك",
        credit: "ائتمان",
      };
      return (
        <span>
          {methods[row.original.paymentMethod] || row.original.paymentMethod}
        </span>
      );
    },
  },

  {
    accessorKey: "expenseDate",
    header: "التاريخ",
    cell: ({ row }) => {
      const date = new Date(row.original.expenseDate);
      return <div>{date.toLocaleDateString("ar-EG")}</div>;
    },
  },

  {
    accessorKey: "status",
    header: "الحالة",
    cell: ({ row }) => {
      const status = row.original.status;
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
        <Badge className={colors[status]}>{labels[status] || status}</Badge>
      );
    },
  },

  {
    id: "actions",
    header: "الإجراءات",
    cell: ({ row }) => (
      <div className="flex gap-2">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>تعديل المصروف</DialogTitle>
            </DialogHeader>
            {/* <ExpenseEditForm expense={row.original} /> */}
          </DialogContent>
        </Dialog>
      </div>
    ),
  },
];
