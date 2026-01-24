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
import { useFormatter } from "@/hooks/usePrice";
import { useTranslations } from "next-intl";
import { useCompany } from "@/hooks/useCompany";
import { Receipt, ReceiptItem } from "@/components/common/receipt";
import { PrintButton } from "./test";

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
      const { formatCurrency } = useFormatter();
      return formatCurrency(price);
    },
  },
  {
    accessorKey: "amountPaid",
    header: ({ column }) => <SortableHeader column={column} label="المدفوع" />,
    cell: ({ row }) => {
      const price = row.getValue("amountPaid") as number;
      const { formatCurrency } = useFormatter();
      return formatCurrency(price);
    },
  },

  {
    accessorKey: "saleNumber",
    header: ({ column }) => (
      <SortableHeader column={column} label="رقم الفاتورة" />
    ),
    cell: ({ row }) => <div>{row.getValue("saleNumber")}</div>,
  },
  {
    accessorKey: "amountDue",
    header: ({ column }) => <SortableHeader column={column} label="المتبقي" />,
    cell: ({ row }) => {
      const price = row.getValue("amountDue") as number;
      const { formatCurrency } = useFormatter();
      return formatCurrency(price);
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
      const label = type === "return" ? "إرجاع" : type === "SALE" ? "بيع" : "-";
      const color =
        type === "return"
          ? "bg-red-100 text-red-800"
          : "bg-green-100 text-green-800";

      return <Badge className={color}>{label}</Badge>;
    },
  },
  {
    accessorKey: "reason",
    header: "سبب الإرجاع",
    cell: ({ row }) => {
      const type = row.original.sale_type; // ← sale type
      const reason = row.original.reason; // ← reason

      // Only show reason if NOT a return sale
      if (type !== "return") return "—";

      return reason ? reason : "—";
    },
  },

  {
    accessorKey: "status",
    header: ({ column }) => <SortableHeader column={column} label="الحالة" />,
    cell: ({ row }) => {
      const status = row.original.status;
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
      const t = useTranslations("payment");

      const { company } = useCompany();

      const userAgent =
        typeof window !== "undefined" ? navigator.userAgent.toLowerCase() : "";
      const isMobileUA =
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
          userAgent,
        );
      const debt = row.original;
      const amountDue = Number(debt.amountDue) || 0; // ✅ convert to number safely

      return (
        <div className="flex flex-row gap-2">
          {amountDue > 0 && debt.sale_type !== "RETURN" && (
            <Debtupdate debt={debt} />
          )}
          {isMobileUA ? (
            <PrintButton
              saleNumber={debt.invoiceNumber ?? ""}
              items={debt.saleItems.map((item: any) => ({
                name: item.name,
                warehousename: item.warehousename,
                selectedQty: item.selectedQty,
                sellingUnit: item.sellingUnit,
                unit_price: item.unitPrice,
                pricePerUnit: item.unitPrice,
                total: item.total,
              }))}
              totals={{
                totalBefore: debt.totalAmount,
                discount: 0,
                totalAfter: debt.totalAmount,
              }}
              receivedAmount={Number(debt.amountPaid ?? 0)}
              calculatedChange={Number(debt.calculated_change ?? 0)}
              userName={debt.cashierName ?? ""}
              customerName={debt.customer?.name ?? "لايوجد"}
              customerDebt={Number(debt.customer_debt ?? 0)}
              isCash={Boolean(debt.is_cash)}
              t={t}
              company={company}
            />
          ) : (
            <Receipt
              saleNumber={debt.invoiceNumber ?? ""}
              items={debt.saleItems.map((item: any) => ({
                id: item.id,
                name: item.product.name,
                warehousename: item.warehouse,
                selectedQty: item.quantity,
                sellingUnit: item.unit,
                unit_price: item.unitPrice,

                total: item.totalPrice,
              }))}
              totals={{
                totalBefore: debt.totalAmount,
                discount: debt.items?.discount ?? 0,
                totalAfter: debt.totalAmount,
              }}
              receivedAmount={Number(debt.amountPaid ?? 0)}
              calculatedChange={Number(debt.calculated_change ?? 0)}
              userName={debt.cashierName ?? ""}
              customerName={debt.customer?.name ?? "لايوجد"}
              customerDebt={Number(debt.customer_debt ?? 0)}
              isCash={Boolean(debt.is_cash)}
              t={t}
              company={company}
            />
          )}
          {debt.sale_type === "SALE" && <ReturnForm sale={debt} />}
        </div>
      );
    },
  },
];
