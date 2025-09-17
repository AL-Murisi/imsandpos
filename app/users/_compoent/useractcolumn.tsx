import CustomDialog from "@/components/common/Dailog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, EditIcon } from "lucide-react";
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
              <EditIcon />
            </Button>
          }
          title="تفاصيل النشاط"
          description="عرض تفاصيل النشاط بالكامل"
        >
          <div className="p-4">
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
