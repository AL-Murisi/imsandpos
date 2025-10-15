// columns.tsx - OPTIMIZED
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ColumnDef } from "@tanstack/react-table";

// ✅ CRITICAL: Individual icon imports (saves ~180KB)
import ArrowDown from "lucide-react/dist/esm/icons/arrow-down";
import ArrowUp from "lucide-react/dist/esm/icons/arrow-up";
import ArrowUpDown from "lucide-react/dist/esm/icons/arrow-up-down";
import Edit from "lucide-react/dist/esm/icons/edit";

import CustomDialog from "@/components/common/Dailog";
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

export const RecentSale: ColumnDef<DebtSaleData>[] = [
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
    accessorKey: "u",
    header: "#",
    cell: ({ row }) => row.index + 1,
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
        <CustomDialog
          trigger={
            <Button variant="outline">
              <Edit className="h-4 w-4" />
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

export const userActivity: ColumnDef<any>[] = [
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
    accessorKey: "index",
    header: "#",
    cell: ({ row }) => row.index + 1,
  },
  {
    accessorKey: "user.name",
    header: ({ column }) => (
      <SortableHeader column={column} label="اسم المستخدم" />
    ),
  },
  {
    accessorKey: "userRoles",
    header: ({ column }) => <SortableHeader column={column} label="الأدوار" />,
    cell: ({ row }) =>
      row.original.user?.roles?.map((r: any) => r.role?.name).join(", ") || "-",
  },
  {
    accessorKey: "action",
    header: ({ column }) => <SortableHeader column={column} label="الإجراء" />,
  },
  {
    accessorKey: "details",
    header: ({ column }) => <SortableHeader column={column} label="التفاصيل" />,
  },
  {
    accessorKey: "ip",
    header: ({ column }) => <SortableHeader column={column} label="IP" />,
  },
  {
    accessorKey: "userAgent",
    header: ({ column }) => (
      <SortableHeader column={column} label="User Agent" />
    ),
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => <SortableHeader column={column} label="التاريخ" />,
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const log = row.original;
      return (
        <CustomDialog
          trigger={
            <Button variant="outline">
              <Edit className="h-4 w-4" />
            </Button>
          }
          title="تفاصيل النشاط"
          description="عرض تفاصيل النشاط بالكامل"
        >
          <div className="space-y-2 p-4">
            <p>
              <strong>المستخدم:</strong> {log.user.name}
            </p>
            <p>
              <strong>الأدوار:</strong>{" "}
              {log?.userRoles?.map((r: any) => r.role.name).join(", ")}
            </p>
            <p>
              <strong>الإجراء:</strong> {log.action}
            </p>
            <p>
              <strong>التفاصيل:</strong> {log.details || "-"}
            </p>
            <p>
              <strong>IP:</strong> {log.ip || "-"}
            </p>
            <p>
              <strong>User Agent:</strong> {log.userAgent || "-"}
            </p>
            <p>
              <strong>التاريخ:</strong>{" "}
              {new Date(log.createdAt).toLocaleString()}
            </p>
          </div>
        </CustomDialog>
      );
    },
  },
];
