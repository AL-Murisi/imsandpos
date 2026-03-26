import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type InventoryRow = {
  id: string;
  productName: string;
  sku: string;
  warehouseName: string;
  supplierName: string;
  availableQuantity: number;
  reorderLevel: number;
  status: string;
};

type MovementRow = {
  id: string;
  productName: string;
  sku: string;
  warehouseName: string;
  movementType: string;
  quantity: number;
  createdAt: string;
  actor: string;
};

interface InventoryTablesProps {
  urgentItems: InventoryRow[];
  healthiestItems: InventoryRow[];
  movementRows: MovementRow[];
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function StatusBadge({ status }: { status: string }) {
  if (status === "نفد المخزون") {
    return <Badge className="bg-rose-100 text-rose-700">{status}</Badge>;
  }

  if (status === "مخزون منخفض") {
    return <Badge className="bg-amber-100 text-amber-800">{status}</Badge>;
  }

  return <Badge className="bg-emerald-100 text-emerald-700">{status}</Badge>;
}

function InventoryStatusTable({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: InventoryRow[];
}) {
  return (
    <Card className="border-0 bg-white/90 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-slate-900">
          {title}
        </CardTitle>
        <p className="text-sm text-slate-500">{description}</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader className="bg-slate-50 shadow-none">
              <TableRow>
                <TableHead className="text-right">الصنف</TableHead>
                <TableHead className="text-right">المخزن</TableHead>
                <TableHead className="text-right">المورد</TableHead>
                <TableHead className="text-right">المتاح</TableHead>
                <TableHead className="text-right">حد الطلب</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-slate-900">
                          {row.productName}
                        </div>
                        <div className="text-xs text-slate-500">{row.sku}</div>
                      </div>
                    </TableCell>
                    <TableCell>{row.warehouseName}</TableCell>
                    <TableCell>{row.supplierName}</TableCell>
                    <TableCell>{row.availableQuantity}</TableCell>
                    <TableCell>{row.reorderLevel}</TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-slate-500">
                    لا توجد أصناف للعرض.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function MovementTable({ rows }: { rows: MovementRow[] }) {
  return (
    <Card className="border-0 bg-white/90 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-slate-900">
          آخر حركات المخزون
        </CardTitle>
        <p className="text-sm text-slate-500">
          أحدث نشاطات المخزن بين الاستلام والتحديثات على المخزون.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader className="bg-slate-50 shadow-none">
              <TableRow>
                <TableHead className="text-right">الصنف</TableHead>
                <TableHead className="text-right">المخزن</TableHead>
                <TableHead className="text-right">النوع</TableHead>
                <TableHead className="text-right">الكمية</TableHead>
                <TableHead className="text-right">بواسطة</TableHead>
                <TableHead className="text-right">الوقت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-slate-900">
                          {row.productName}
                        </div>
                        <div className="text-xs text-slate-500">{row.sku}</div>
                      </div>
                    </TableCell>
                    <TableCell>{row.warehouseName}</TableCell>
                    <TableCell>{row.movementType}</TableCell>
                    <TableCell>{row.quantity}</TableCell>
                    <TableCell>{row.actor}</TableCell>
                    <TableCell>{formatDate(row.createdAt)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-slate-500">
                    لا توجد حركات مسجلة بعد.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function InventoryTables({
  urgentItems,
  healthiestItems,
  movementRows,
}: InventoryTablesProps) {
  return (
    <div className="space-y-6">
      <InventoryStatusTable
        title="أصناف تحتاج تزويد عاجل"
        description="الأصناف التي وصلت إلى حد إعادة الطلب أو أقل وتحتاج تدخل المخزن."
        rows={urgentItems}
      />
      <InventoryStatusTable
        title="أفضل الأصناف توفراً"
        description="الأصناف التي تملك أعلى كمية متاحة حالياً."
        rows={healthiestItems}
      />
      <MovementTable rows={movementRows} />
    </div>
  );
}
